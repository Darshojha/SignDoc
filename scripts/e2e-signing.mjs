// End-to-end test of the full envelope signing lifecycle against the running dev
// server + live Supabase. Verifies the signed PDF actually embeds captured values.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs"),
).href;

async function extractPdf(bytes) {
  const doc = await pdfjs.getDocument({ data: bytes, useSystemFonts: true }).promise;
  let text = "";
  let imageOps = 0;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    text += content.items.map((i) => i.str).join(" ") + "\n";
    const ops = await page.getOperatorList();
    for (const fn of ops.fnArray) {
      if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintImageXObjectRepeat) imageOps++;
    }
  }
  return { text, imageOps };
}

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const BASE = "http://localhost:3000";
const EMAIL = "e2e-owner@example.com";
const PASSWORD = "e2e-password-123";
// 1x1 red PNG.
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==";

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const log = (...a) => console.log(...a);
function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  log("  ✓ " + msg);
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((res) => setTimeout(res, 1000));
  }
  throw new Error("dev server never became ready");
}

async function main() {
  await waitForServer();
  log("Server ready.");

  // 1. Ensure user + sign in for bearer token.
  await admin.auth.admin
    .createUser({ email: EMAIL, password: PASSWORD, email_confirm: true })
    .catch(() => {});
  const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (signErr || !signIn.session) throw new Error("sign in failed: " + signErr?.message);
  const token = signIn.session.access_token;
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  log("Signed in as owner.");

  // 2. Upload template.
  const pdfBytes = readFileSync(new URL("../test-template.pdf", import.meta.url));
  const fd = new FormData();
  fd.append("name", `E2E Template ${Date.now()}`);
  fd.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "test-template.pdf");
  const upRes = await fetch(`${BASE}/api/v1/templates`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const upData = await upRes.json();
  assert(upRes.status === 201 && upData.template?.id, "template uploaded");
  const templateId = upData.template.id;

  // 3. Place fields: signature (required), text, date, checkbox — all Signer 1.
  const fields = [
    { id: "f-sig", page: 1, x: 10, y: 10, width: 30, height: 8, field_type: "signature", assigned_role: "Signer 1", is_required: true },
    { id: "f-txt", page: 1, x: 10, y: 25, width: 40, height: 5, field_type: "text", assigned_role: "Signer 1", is_required: true },
    { id: "f-date", page: 1, x: 10, y: 35, width: 20, height: 5, field_type: "date", assigned_role: "Signer 1" },
    { id: "f-chk", page: 1, x: 10, y: 45, width: 5, height: 5, field_type: "checkbox", assigned_role: "Signer 1" },
  ];
  const patchRes = await fetch(`${BASE}/api/v1/templates/${templateId}`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ field_layout: fields }),
  });
  assert(patchRes.ok, "field layout saved");

  // 4. Create envelope.
  const envRes = await fetch(`${BASE}/api/v1/envelopes`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      template_id: templateId,
      title: "E2E Envelope",
      signing_order: "parallel",
      signers: [{ name: "Test Signer", email: "signer@example.com", assigned_role: "Signer 1", order_index: 1 }],
    }),
  });
  const envData = await envRes.json();
  assert(envRes.status === 201 && envData.envelope?.id, "envelope created");
  const envelopeId = envData.envelope.id;

  // 5. Send.
  const sendRes = await fetch(`${BASE}/api/v1/envelopes/${envelopeId}/send`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({}),
  });
  const sendData = await sendRes.json();
  assert(sendRes.ok && sendData.signer_links?.length === 1, "envelope sent, got signer link");
  const signUrl = sendData.signer_links[0].url;
  const signerToken = signUrl.split("/sign/")[1];
  assert(Boolean(signerToken), "extracted signer token");

  // 6. Signer opens (marks viewed).
  const viewRes = await fetch(`${BASE}/api/v1/signing/${signerToken}`);
  assert(viewRes.ok, "signer opened signing page");

  // 7. Capture each field.
  async function capture(fieldId, value) {
    const r = await fetch(`${BASE}/api/v1/signing/${signerToken}/signatures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field_id: fieldId, image_data: value, method: "typed" }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(`capture ${fieldId} failed: ${d?.error?.message}`);
    return d;
  }
  await capture("f-sig", PNG);
  await capture("f-txt", "Hello World E2E");
  await capture("f-date", "2026-07-13");
  await capture("f-chk", "✓");
  log("  ✓ captured signature + text + date + checkbox");

  // Verify required-field guard: create a second envelope and try to sign with nothing.
  // (Covered implicitly; main flow below has all required filled.)

  // 8. Submit signing.
  const signRes = await fetch(`${BASE}/api/v1/signing/${signerToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signature_text: "Test Signer" }),
  });
  const signData = await signRes.json();
  assert(signRes.ok, "signing submitted");
  assert(signData.envelope?.status === "COMPLETED", `envelope COMPLETED (got ${signData.envelope?.status})`);

  // 9. Fetch details + verify signed doc path.
  const detRes = await fetch(`${BASE}/api/v1/envelopes/${envelopeId}`, { headers: authHeaders });
  const detData = await detRes.json();
  const signedPath = detData.envelope.document.signed_storage_path;
  assert(Boolean(signedPath), "signed_storage_path set");

  // 10. Download signed PDF and verify embedded values.
  const dl = await admin.storage.from("envelopes").download(signedPath);
  if (dl.error) throw new Error("download signed pdf failed: " + dl.error.message);
  const signedBytes = new Uint8Array(await dl.data.arrayBuffer());
  const origBytes = new Uint8Array(pdfBytes);
  assert(signedBytes.length > origBytes.length, `signed PDF larger than original (${signedBytes.length} > ${origBytes.length})`);

  const doc = await PDFDocument.load(signedBytes);
  assert(doc.getPageCount() >= 1, "signed PDF parses");

  assert(doc.getPageCount() >= 2, `certificate page appended (${doc.getPageCount()} pages)`);

  const { text, imageOps } = await extractPdf(signedBytes);
  assert(text.includes("Hello World E2E"), "captured text field rendered in signed PDF");
  assert(text.includes("7/13/2026"), "captured date rendered (formatted) in signed PDF");
  assert(text.includes("X"), "checkbox mark rendered in signed PDF");
  assert(imageOps >= 1, `signature image embedded in signed PDF (${imageOps} image draw ops)`);
  assert(text.includes("Certificate of Completion"), "completion certificate present in signed PDF");
  assert(text.includes("signer@example.com"), "signer email recorded on certificate");
  assert(text.includes(envelopeId), "envelope id recorded on certificate");

  // 11. Verify captures persisted in DB.
  const { data: sigs } = await admin.from("signatures").select("field_id").eq("envelope_id", envelopeId);
  assert(sigs.length === 4, `4 field captures persisted (got ${sigs.length})`);

  // 12. Negative test: server rejects signing when required fields are unfilled.
  const env2Res = await fetch(`${BASE}/api/v1/envelopes`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      template_id: templateId,
      title: "E2E Required Guard",
      signing_order: "parallel",
      signers: [{ name: "Guard Signer", email: "guard@example.com", assigned_role: "Signer 1", order_index: 1 }],
    }),
  });
  const env2 = (await env2Res.json()).envelope;
  const send2 = await fetch(`${BASE}/api/v1/envelopes/${env2.id}/send`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({}),
  });
  const token2 = (await send2.json()).signer_links[0].url.split("/sign/")[1];
  await fetch(`${BASE}/api/v1/signing/${token2}`); // open
  const badSign = await fetch(`${BASE}/api/v1/signing/${token2}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signature_text: "Guard Signer" }),
  });
  assert(badSign.status === 400, `signing rejected with 400 without required fields (got ${badSign.status})`);
  const stillDraft = await fetch(`${BASE}/api/v1/envelopes/${env2.id}`, { headers: authHeaders });
  const guardStatus = (await stillDraft.json()).envelope.status;
  assert(guardStatus !== "COMPLETED", `guarded envelope not completed (status ${guardStatus})`);

  // 13. Bulk send fans the template out to multiple recipients.
  const bulkRes = await fetch(`${BASE}/api/v1/templates/${templateId}/bulk-send`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ recipients: [{ email: "bulk1@example.com" }, { name: "Bulk Two", email: "bulk2@example.com" }] }),
  });
  const bulkData = await bulkRes.json();
  assert(bulkRes.status === 202 && bulkData.jobId, "bulk-send job accepted");
  let job;
  for (let i = 0; i < 30; i++) {
    const jr = await fetch(`${BASE}/api/v1/templates/${templateId}/bulk-send?jobId=${bulkData.jobId}`, { headers: authHeaders });
    job = await jr.json();
    if (job.status === "completed" || job.status === "failed") break;
    await new Promise((r) => setTimeout(r, 500));
  }
  assert(job.status === "completed", `bulk-send completed (status ${job.status})`);
  assert(job.succeeded === 2, `bulk-send delivered to 2 recipients (succeeded ${job.succeeded}, failed ${job.failed})`);

  // 14. Sequential multi-signer: two roles, each a signature; verify ordering + layering.
  log("--- multi-signer sequential ---");
  const tpl2 = await fetch(`${BASE}/api/v1/templates`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: (() => {
      const f = new FormData();
      f.append("name", `E2E Multi ${Date.now()}`);
      f.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "t.pdf");
      return f;
    })(),
  });
  const tpl2Id = (await tpl2.json()).template.id;
  await fetch(`${BASE}/api/v1/templates/${tpl2Id}`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({
      field_layout: [
        { id: "s1", page: 1, x: 10, y: 10, width: 30, height: 8, field_type: "signature", assigned_role: "Signer 1", is_required: true },
        { id: "s2", page: 1, x: 10, y: 25, width: 30, height: 8, field_type: "signature", assigned_role: "Signer 2", is_required: true },
      ],
    }),
  });
  const menv = await (await fetch(`${BASE}/api/v1/envelopes`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      template_id: tpl2Id,
      title: "E2E Multi Envelope",
      signing_order: "sequential",
      signers: [
        { name: "First Signer", email: "first@example.com", assigned_role: "Signer 1", order_index: 1 },
        { name: "Second Signer", email: "second@example.com", assigned_role: "Signer 2", order_index: 2 },
      ],
    }),
  })).json();
  const mSend = await (await fetch(`${BASE}/api/v1/envelopes/${menv.envelope.id}/send`, {
    method: "POST", headers: authHeaders, body: JSON.stringify({}),
  })).json();
  const t1 = mSend.signer_links.find((l) => l.assigned_role === "Signer 1").url.split("/sign/")[1];
  const t2 = mSend.signer_links.find((l) => l.assigned_role === "Signer 2").url.split("/sign/")[1];

  // Signer 2 cannot act before Signer 1 (sequential).
  const ctx2Early = await (await fetch(`${BASE}/api/v1/signing/${t2}`)).json();
  assert(ctx2Early.canSign === false, "second signer blocked until first signs (sequential)");

  await fetch(`${BASE}/api/v1/signing/${t1}`);
  await fetch(`${BASE}/api/v1/signing/${t1}/signatures`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field_id: "s1", image_data: PNG, method: "drawn" }),
  });
  const sign1 = await (await fetch(`${BASE}/api/v1/signing/${t1}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signature_text: "First Signer" }),
  })).json();
  assert(sign1.envelope.status === "PARTIALLY_SIGNED", `after signer 1: PARTIALLY_SIGNED (got ${sign1.envelope.status})`);

  const ctx2 = await (await fetch(`${BASE}/api/v1/signing/${t2}`)).json();
  assert(ctx2.canSign === true, "second signer can act after first signs");
  await fetch(`${BASE}/api/v1/signing/${t2}/signatures`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field_id: "s2", image_data: PNG, method: "drawn" }),
  });
  const sign2 = await (await fetch(`${BASE}/api/v1/signing/${t2}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signature_text: "Second Signer" }),
  })).json();
  assert(sign2.envelope.status === "COMPLETED", `after signer 2: COMPLETED (got ${sign2.envelope.status})`);

  const mDet = await (await fetch(`${BASE}/api/v1/envelopes/${menv.envelope.id}`, { headers: authHeaders })).json();
  const mDl = await admin.storage.from("envelopes").download(mDet.envelope.document.signed_storage_path);
  const mBytes = new Uint8Array(await mDl.data.arrayBuffer());
  const mExtract = await extractPdf(mBytes);
  assert(mExtract.imageOps >= 2, `both signer signatures layered in final PDF (${mExtract.imageOps} image ops)`);

  log("\nALL E2E CHECKS PASSED ✅");
  log(`envelope=${envelopeId} template=${templateId}`);
}

main().catch((err) => {
  console.error("\nE2E FAILED ❌\n", err);
  process.exit(1);
});
