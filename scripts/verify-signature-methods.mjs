/**
 * Verify all 3 signature methods end-to-end via API.
 * Creates envelope, sends, signs with typed/drawn/uploaded, verifies save + completion.
 * Run: node scripts/verify-signature-methods.mjs
 */

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

async function request(path, init) {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json, text };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const SIGNATURE_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function createAndSendEnvelope(title, signer) {
  const create = await request("/api/v1/envelopes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      template_id: "ebd57b78-418f-4e98-bec9-23f36645621c",
      title,
      signing_order: "parallel",
      signers: [signer],
    }),
  });
  assert(create.status === 201, `Create failed: ${create.text}`);
  const envelopeId = create.json.envelope.id;

  const send = await request(`/api/v1/envelopes/${envelopeId}/send`, { method: "POST" });
  assert(send.status === 200, `Send failed: ${send.text}`);
  assert(send.json.signer_links?.length > 0, "No signer links returned");

  return {
    envelopeId,
    token: send.json.signer_links[0].url.split("/").pop(),
    signerLink: send.json.signer_links[0],
  };
}

async function completeSigning(token) {
  const res = await request(`/api/v1/signing/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signature_text: "Test Signer" }),
  });
  return res;
}

async function testMethod(method) {
  console.log(`\n===== Testing: ${method} =====`);
  const title = `Signature ${method} ${Date.now()}`;
  const scenario = await createAndSendEnvelope(title, {
    name: `Test ${method}`,
    email: `test.${method}@example.com`,
    assigned_role: "Signer 1",
    order_index: 1,
  });
  console.log(`Envelope: ${scenario.envelopeId}`);
  console.log(`Token: ${scenario.token}`);

  const save = await request(`/api/v1/signing/${scenario.token}/signatures`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      field_id: "field_signature_1",
      image_data: SIGNATURE_PNG,
      method,
    }),
  });
  console.log(`Save signature: ${save.status}`);
  assert(save.status === 200, `Save failed: ${save.text}`);
  const savedSig = save.json.signature;
  console.log(`Saved: id=${savedSig.id}, method=${savedSig.method}, field=${savedSig.field_id}`);
  assert(savedSig.method === method, `Method mismatch: expected ${method}, got ${savedSig.method}`);
  assert(savedSig.field_id === "field_signature_1", `Wrong field_id: ${savedSig.field_id}`);
  assert(savedSig.image_data === SIGNATURE_PNG, "Image data mismatch");

  const list = await request(`/api/v1/signing/${scenario.token}/signatures`);
  console.log(`List signatures: ${list.status}`);
  assert(list.status === 200, `List failed: ${list.text}`);
  const found = (list.json.signatures ?? []).some(
    (s) => s.id === savedSig.id && s.method === method
  );
  console.log(`Found saved signature in list: ${found}`);
  assert(found, "Saved signature missing from list");

  const complete = await completeSigning(scenario.token);
  console.log(`Complete signing: ${complete.status}`);
  assert(complete.status === 200, `Complete failed: ${complete.text}`);
  const envelope = complete.json.envelope;
  console.log(`Envelope status: ${envelope.status}`);
  assert(envelope.status === "COMPLETED", `Expected COMPLETED, got ${envelope.status}`);
  const signer = envelope.signers.find((s) => s.id === scenario.signerLink.signer_id);
  assert(signer?.status === "signed", `Signer not signed: ${signer?.status}`);

  const details = await request(`/api/v1/envelopes/${scenario.envelopeId}`);
  assert(details.status === 200, `Details failed: ${details.text}`);
  const finalEnvelope = details.json.envelope;
  const finalSigner = finalEnvelope.signers.find((s) => s.id === scenario.signerLink.signer_id);
  assert(finalSigner?.status === "signed", `Final signer not signed: ${finalSigner?.status}`);

  console.log(`${method}: PASS`);
  return {
    method,
    pass: true,
    envelopeId: scenario.envelopeId,
    signatureId: savedSig.id,
    fieldId: savedSig.field_id,
    envelopeStatus: finalEnvelope.status,
    signerStatus: finalSigner.status,
  };
}

async function main() {
  const results = {};
  for (const method of ["typed", "drawn", "uploaded"]) {
    results[method] = await testMethod(method);
  }

  console.log("\n=== Final Results ===");
  const summary = {};
  for (const [method, result] of Object.entries(results)) {
    summary[method] = result.pass ? "PASS" : "FAIL";
    console.log(`${method}: ${summary[method]}`);
    if (result.pass) {
      console.log(`  Signature ID: ${result.signatureId}`);
      console.log(`  Field ID: ${result.fieldId}`);
      console.log(`  Envelope: ${result.envelopeId} -> ${result.envelopeStatus}`);
      console.log(`  Signer: ${result.signerStatus}`);
    }
  }

  const allPassed = Object.values(results).every((r) => r.pass);
  console.log(allPassed ? "\nAll 3 methods verified." : "\nSome methods failed.");
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});