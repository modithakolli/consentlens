import assert from "node:assert/strict";
import { getDomainIntel, lookupDomain } from "../src/domainIntel.js";
import { lookupApp } from "../src/appIntel.js";

const clarity = lookupDomain("e.clarity.ms");
assert.equal(clarity.known, true, "Microsoft Clarity should be recognized");
assert.equal(clarity.company, "Microsoft");

const phenom = lookupDomain("phenomtrackapi-ir.phenompeople.com");
assert.equal(phenom.known, true, "Phenom recruiter trackers should be recognized");
assert.equal(phenom.company, "Phenom");

const chatgpt = lookupApp("chatgpt.com");
assert.equal(chatgpt.found, true, "ChatGPT should be recognized as an app profile");
assert.ok(chatgpt.concerns.includes("Prompt retention"), "ChatGPT should mention prompt retention");

const intel = getDomainIntel([
  "browser-intake-datadoghq.com",
  "accounts.google.com",
  "cdn.cookielaw.org"
]);

assert.equal(intel.length, 3, "Expected three site intelligence rows");
assert.ok(intel.some((item) => item.company === "Google"), "Google should appear in site intelligence");
assert.ok(intel.some((item) => item.company === "OneTrust"), "OneTrust should appear in site intelligence");

console.log("Backend site intelligence smoke tests passed.");
