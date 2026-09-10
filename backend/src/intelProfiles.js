import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const INTEL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../shared/intel");
const FILES = ["service-profiles.json", "ai-training-patterns.json", "retention-patterns.json", "data-sharing-patterns.json"];
const host = (value) => String(value || "").toLowerCase().replace(/^www\./, "");
const matches = (candidate, domain) => host(candidate) === host(domain) || host(candidate).endsWith(`.${host(domain)}`) || host(domain).endsWith(`.${host(candidate)}`);

function records(filename) {
  try { const parsed = JSON.parse(readFileSync(resolve(INTEL_DIR, filename), "utf8")); return Array.isArray(parsed.records) ? parsed.records : []; } catch { return []; }
}

export function sourceFactsForDomain(domain) {
  return FILES.flatMap((file) => records(file).filter((record) => (record.domains || []).some((item) => matches(item, domain))).map((record) => ({ ...record, recordType: file.replace("-patterns.json", "").replace(".json", "") })));
}
