import assert from "node:assert/strict";
import { decision, friendlyReason } from "../src/popup/risk.js";

assert.equal(friendlyReason("Cookie banner appears to emphasize accepting without an equally visible reject choice."), "Cookie choices favor Accept");
const result = decision({ risk: { score: 44, level: "Medium", reasons: ["Third-party partners were observed"] }, thirdParties: [{ host: "example.test" }], content: {} });
assert.equal(result.verdict, "Use caution");
assert.ok(result.risks.includes("1 outside services"));
console.log("Popup risk decision tests passed.");
