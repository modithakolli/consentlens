import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { publicDomain, text } from "./schemas.js";

const PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../data/verification-registry.json");
const ALLOWED = new Set(["claimed", "under_review", "verified", "rejected", "suspended", "revoked"]);
async function readAll() { try { const data = JSON.parse(await readFile(PATH, "utf8")); return Array.isArray(data) ? data : []; } catch { return []; } }
async function writeAll(value) { await mkdir(dirname(PATH), { recursive: true }); await writeFile(PATH, JSON.stringify(value, null, 2), "utf8"); }

export async function verificationFor(domain) { return (await readAll()).find((entry) => entry.domain === publicDomain(domain)) || null; }

export async function reviewVerification(input) {
  const domain = publicDomain(input.domain); const status = text(input.status, 30);
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain) || !ALLOWED.has(status)) throw new Error("Valid domain and verification status are required");
  if (status === "verified" && (!input.expiresAt || !text(input.criteriaVersion, 60))) throw new Error("Verified status requires an expiry date and criteria version");
  const all = await readAll(); const existing = all.find((entry) => entry.domain === domain); const now = new Date().toISOString();
  const record = { domain, status, scope: text(input.scope, 500), criteriaVersion: text(input.criteriaVersion, 60), issuedAt: status === "verified" ? existing?.issuedAt || now : existing?.issuedAt || null, expiresAt: status === "verified" ? text(input.expiresAt, 40) : null, reviewedAt: now, reason: text(input.reason, 2000), history: [...(existing?.history || []), { status, at: now, reason: text(input.reason, 500) }].slice(-25) };
  await writeAll([record, ...all.filter((entry) => entry.domain !== domain)]);
  return record;
}
