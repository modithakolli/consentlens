import assert from "node:assert/strict";
import { lookupApp } from "../src/appIntel.js";
import { legalRightsForRegion } from "../src/legalRights.js";

function labels(items) {
  return (items || []).map((item) => item.label || item);
}

const openai = lookupApp("openai.com");
assert.equal(openai.found, true, "OpenAI profile should be found");
assert(labels(openai.controls).includes("Training toggle"), "OpenAI should expose a training toggle control");
assert(labels(openai.controls).includes("Temporary chats"), "OpenAI should expose temporary chat controls");

const anthropic = lookupApp("claude.ai");
assert.equal(anthropic.found, true, "Anthropic profile should be found");
assert(labels(anthropic.controls).includes("Delete account path"), "Anthropic should expose a delete-account path");

const google = lookupApp("google.com");
assert.equal(google.found, true, "Google profile should be found");
assert(labels(google.controls).includes("Web & App Activity"), "Google should expose activity controls");

const rights = legalRightsForRegion("IN");
assert.ok(rights.rights.length > 0, "Indian rights summary should include at least one right");

console.log("Backend app intelligence smoke tests passed.");
