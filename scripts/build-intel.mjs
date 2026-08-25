import { readFileSync, writeFileSync } from "node:fs";

const records = JSON.parse(readFileSync(new URL("../shared/intel/service-profiles.json", import.meta.url))).records;
const categoryFor = (purpose) => /consent/i.test(purpose) ? "consent" : /identity|access/i.test(purpose) ? "identity" : /analytics|monitoring|tag/i.test(purpose) ? "analytics" : "utility";
const profiles = records.map((record) => ({ company: record.provider, category: categoryFor(record.purpose), risk: categoryFor(record.purpose) === "consent" ? "low" : "medium", purpose: record.purpose, hq: "Not established", reputation: `Source-backed; reviewed ${record.lastReviewed}`, domains: record.domains }));
const output = `// Generated from shared/intel/service-profiles.json. Do not hand-edit.\nself.ConsentLensServiceProfiles = ${JSON.stringify(profiles, null, 2)};\n`;
writeFileSync(new URL("../extension/src/intel/service-profiles.js", import.meta.url), output);
console.log(`Built ${profiles.length} browser service profiles.`);
