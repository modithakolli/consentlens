import assert from "node:assert/strict";
import { Script, createContext } from "node:vm";
import { readFileSync } from "node:fs";

const context = createContext({ self: {} });
new Script(readFileSync(new URL("../src/storage.js", import.meta.url), "utf8")).runInContext(context);
const store = context.self.ConsentLensStorage;
const record = store.tracker({ host: "WWW.Example.COM", company: { unsafe: true }, observedSites: ["a.test", 42, "b.test"], requests: -1 });
assert.equal(record.host, "example.com");
assert.equal(record.company, "");
assert.deepEqual([...record.observedSites], ["a.test", "b.test"]);
assert.equal(record.requests, 0);
const settings = store.settings({ apiBaseUrl: "javascript:alert(1)", region: "in<script>" }, { apiBaseUrl: "http://localhost:8787", region: "IN" });
assert.equal(settings.apiBaseUrl, "http://localhost:8787");
assert.equal(settings.region, "INSCRIP");
console.log("Extension storage schema tests passed.");
