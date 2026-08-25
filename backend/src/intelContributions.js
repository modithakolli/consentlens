import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { httpsUrls, publicDomain, text } from "./schemas.js";

const PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../data/intel-contributions.json");
async function readAll() { try { const data = JSON.parse(await readFile(PATH, "utf8")); return Array.isArray(data) ? data : []; } catch { return []; } }
async function writeAll(value) { await mkdir(dirname(PATH), { recursive: true }); await writeFile(PATH, JSON.stringify(value, null, 2), "utf8"); }

export async function submitContribution(input) {
  const domain = publicDomain(input.domain);
  const sourceUrls = httpsUrls(input.sourceUrls);
  const kind = text(input.kind, 40);
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) throw new Error("A public domain is required");
  if (!sourceUrls.length) throw new Error("At least one public HTTPS source is required");
  if (!['service-profile', 'policy-fact', 'retention', 'ai-training', 'data-sharing', 'consent-interface'].includes(kind)) throw new Error("Unsupported contribution kind");
  const entry = { id: randomUUID(), domain, kind, summary: text(input.summary, 2000), sourceUrls, status: "submitted", submittedAt: new Date().toISOString(), review: null };
  const all = await readAll(); all.unshift(entry); await writeAll(all.slice(0, 2000));
  return { id: entry.id, status: entry.status };
}
