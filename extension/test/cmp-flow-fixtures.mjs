import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/ui/consent-warning.js", import.meta.url), "utf8");
const scanner = readFileSync(new URL("../src/scanners/consent.js", import.meta.url), "utf8");

// These fixtures are intentionally markup-level contracts for CMPs that
// render a second panel after "Manage preferences". Browser smoke tests use
// the same names before every release.
const fixtures = [
  { name: "OneTrust preference center", root: "#onetrust-pc-sdk", action: "Allow All Cookies" },
  { name: "Didomi preferences", root: "#didomi-host", action: "Agree and close" },
  { name: "Sourcepoint privacy manager", root: "#sp_message_container", action: "Accept All" },
  { name: "dialog preference panel", root: "[role=dialog]", action: "Accept preferences" }
];

assert.match(source, /didomi/i);
assert.match(source, /sp_message/i);
assert.match(source, /composedPath/);
assert.match(scanner, /didomi/i);
assert.match(scanner, /sp_message/i);
fixtures.forEach((fixture) => {
  assert.match(fixture.action, /allow|accept|agree/i, fixture.name);
  assert.ok(fixture.root.length > 3, fixture.name);
});
console.log(`CMP flow fixtures passed: ${fixtures.map((fixture) => fixture.name).join(", ")}.`);
