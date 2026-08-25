import assert from "node:assert/strict";
import { isBlockedIp } from "../src/policyAnalyzer.js";

for (const address of ["127.0.0.1", "10.0.0.8", "172.16.2.4", "192.168.1.4", "169.254.1.2", "::1", "fc00::1", "fe80::1"]) {
  assert.equal(isBlockedIp(address), true, `${address} must be blocked`);
}
for (const address of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"]) {
  assert.equal(isBlockedIp(address), false, `${address} must be permitted`);
}
console.log("Policy SSRF address tests passed.");
