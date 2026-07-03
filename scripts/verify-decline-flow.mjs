import { existsSync } from "node:fs";
import { chromium } from "playwright";

const baseUrl = "http://localhost:3000";
const chromeCandidates = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
];

const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
if (!chromePath) {
  throw new Error("Chrome executable not found. Set PLAYWRIGHT_CHROME_PATH to a valid chrome.exe.");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function apiJson(path, init) {
  const res = await fetch(`${baseUrl}${path}`, init);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json, text };
}

async function createAndSendEnvelope(title, signer1, signer2) {
  const create = await apiJson("/api/v1/envelopes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      template_id: "ebd57b78-418f-4e98-bec9-23f36645621c",
      title,
      signing_order: "sequential",
      signers: [signer1, signer2],
    }),
  });
  assert(create.status === 201, `Create failed for ${title}: ${create.text}`);

  const envelopeId = create.json.envelope.id;
  const send = await apiJson(`/api/v1/envelopes/${envelopeId}/send`, { method: "POST" });
  assert(send.status === 200, `Send failed for ${title}: ${send.text}`);

  return {
    envelopeId,
    signerLinks: send.json.signer_links,
  };
}

const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const context = await browser.newContext({ baseURL: baseUrl });
const page = await context.newPage();

const summary = {};

try {
  const scenario1 = await createAndSendEnvelope(
    `Decline Flow Script A ${Date.now()}`,
    { name: "Script One", email: "script.one@example.com", assigned_role: "Signer 1", order_index: 1 },
    { name: "Script Two", email: "script.two@example.com", assigned_role: "Signer 2", order_index: 2 },
  );

  await page.goto(scenario1.signerLinks[0].url);
  await page.getByLabel("Decline reason").fill("Need a corrected draft before approval.");
  const declineResponse = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes(`/api/v1/envelopes/${scenario1.envelopeId}/signers/${scenario1.signerLinks[0].signer_id}/decline`) &&
        res.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Decline document" }).click(),
  ]).then(([res]) => res);
  await page.waitForLoadState("networkidle");
  const signerPageText = await page.locator("body").innerText();

  await page.goto(`/envelopes/${scenario1.envelopeId}`);
  const dashboardText = await page.locator("body").innerText();

  summary.currentSignerDecline = {
    status: declineResponse.status(),
    ui: {
      declinedBanner: signerPageText.includes("Declined successfully."),
      envelopeStatus: signerPageText.includes("Envelope\nDECLINED"),
    },
    dashboard: {
      hasReason: dashboardText.includes("Reason: Need a corrected draft before approval."),
      hasEvent: dashboardText.includes("signer.declined"),
    },
  };

  const scenario2 = await createAndSendEnvelope(
    `Decline Flow Script B ${Date.now()}`,
    { name: "Order One", email: "order.one@example.com", assigned_role: "Signer 1", order_index: 1 },
    { name: "Order Two", email: "order.two@example.com", assigned_role: "Signer 2", order_index: 2 },
  );

  await page.goto(scenario2.signerLinks[1].url);
  const nonCurrentText = await page.locator("body").innerText();
  const nonCurrentAttempt = await page.evaluate(
    async ({ envelopeId, signerId, token }) => {
      const res = await fetch(`/api/v1/envelopes/${envelopeId}/signers/${signerId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Signer-Token": token },
        body: JSON.stringify({ reason: "Attempting an out-of-order decline." }),
      });
      return { status: res.status, body: await res.text() };
    },
    {
      envelopeId: scenario2.envelopeId,
      signerId: scenario2.signerLinks[1].signer_id,
      token: scenario2.signerLinks[1].url.split("/").pop(),
    },
  );
  summary.nonCurrentSignerDecline = {
    status: nonCurrentAttempt.status,
    ui: {
      waitingBanner: nonCurrentText.includes("waiting on earlier signers"),
      noDeclineButton: (await page.getByRole("button", { name: "Decline document" }).count()) === 0,
    },
  };

  const scenario3 = await createAndSendEnvelope(
    `Decline Flow Script C ${Date.now()}`,
    { name: "Blank One", email: "blank.one@example.com", assigned_role: "Signer 1", order_index: 1 },
    { name: "Blank Two", email: "blank.two@example.com", assigned_role: "Signer 2", order_index: 2 },
  );

  await page.goto(scenario3.signerLinks[0].url);
  await page.getByRole("button", { name: "Decline document" }).click();
  const emptyReasonUi = await page.locator("body").innerText();
  const emptyReasonApi = await page.evaluate(
    async ({ envelopeId, signerId, token }) => {
      const res = await fetch(`/api/v1/envelopes/${envelopeId}/signers/${signerId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Signer-Token": token },
        body: JSON.stringify({ reason: "   " }),
      });
      return { status: res.status, body: await res.text() };
    },
    {
      envelopeId: scenario3.envelopeId,
      signerId: scenario3.signerLinks[0].signer_id,
      token: scenario3.signerLinks[0].url.split("/").pop(),
    },
  );
  summary.emptyReasonDecline = {
    status: emptyReasonApi.status,
    ui: {
      inlineError: emptyReasonUi.includes("Provide a decline reason before submitting."),
    },
  };

  const completedEnvelopeRes = await apiJson("/api/v1/envelopes");
  assert(completedEnvelopeRes.status === 200, "Failed to load envelopes list.");
  const completedEnvelope = completedEnvelopeRes.json.envelopes.find((envelope) => envelope.status === "COMPLETED");
  assert(completedEnvelope, "No completed envelope was available for the terminal decline check.");

  const completedDetails = await apiJson(`/api/v1/envelopes/${completedEnvelope.id}`);
  assert(completedDetails.status === 200, `Failed to load completed envelope details: ${completedDetails.text}`);
  const completedSigner = completedDetails.json.envelope.signers[0];
  const completedAttempt = await page.evaluate(
    async ({ envelopeId, signerId }) => {
      const res = await fetch(`/api/v1/envelopes/${envelopeId}/signers/${signerId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Signer-Token": "irrelevant-token" },
        body: JSON.stringify({ reason: "Too late now." }),
      });
      return { status: res.status, body: await res.text() };
    },
    {
      envelopeId: completedEnvelope.id,
      signerId: completedSigner.id,
    },
  );
  summary.completedEnvelopeDecline = {
    status: completedAttempt.status,
  };

  const ok =
    summary.currentSignerDecline.status === 200 &&
    summary.currentSignerDecline.ui.declinedBanner &&
    summary.currentSignerDecline.dashboard.hasReason &&
    summary.currentSignerDecline.dashboard.hasEvent &&
    summary.nonCurrentSignerDecline.status === 403 &&
    summary.nonCurrentSignerDecline.ui.waitingBanner &&
    summary.nonCurrentSignerDecline.ui.noDeclineButton &&
    summary.emptyReasonDecline.status === 400 &&
    summary.emptyReasonDecline.ui.inlineError &&
    summary.completedEnvelopeDecline.status === 409;

  assert(ok, `Decline verification failed: ${JSON.stringify(summary, null, 2)}`);
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
}
