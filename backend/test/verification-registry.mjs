import assert from "node:assert/strict";
import { reviewVerification } from "../src/verificationRegistry.js";

await assert.rejects(
  () => reviewVerification({ domain: "example.com", status: "verified", criteriaVersion: "v1" }),
  /expiry date/
);
const verified = await reviewVerification({ domain: "example.com", status: "verified", criteriaVersion: "v1", expiresAt: "2027-08-25", scope: "Public web privacy assessment", reason: "Test record" });
assert.equal(verified.status, "verified");
assert.equal(verified.criteriaVersion, "v1");
const revoked = await reviewVerification({ domain: "example.com", status: "revoked", reason: "Test revocation" });
assert.equal(revoked.status, "revoked");
assert.equal(revoked.expiresAt, null);
console.log("Verification lifecycle tests passed.");
