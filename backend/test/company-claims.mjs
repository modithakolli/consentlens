import assert from "node:assert/strict";
import { submitCompanyClaim } from "../src/companyClaims.js";

await assert.rejects(() => submitCompanyClaim({ domain: "example.com", contact: "review@example.com", evidenceUrls: [] }), /HTTPS evidence/);
const claim = await submitCompanyClaim({ domain: "example.com", contact: "review@example.com", evidenceUrls: ["https://example.com/privacy"], statement: "Test claim" });
assert.equal(claim.status, "pending_domain_verification");
assert.equal(claim.challenge.record, "_consentlens-verify.example.com");
assert.match(claim.challenge.token, /^consentlens=/);
console.log("Company claim challenge tests passed.");
