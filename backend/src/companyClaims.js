import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DATA_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../data/company-claims.json");
const clean = (value, max = 500) => String(value || "").trim().slice(0, max);

async function readClaims() {
  try { const value = JSON.parse(await readFile(DATA_PATH, "utf8")); return Array.isArray(value) ? value : []; } catch { return []; }
}

async function writeClaims(claims) {
  await mkdir(dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(claims, null, 2), "utf8");
}

export async function submitCompanyClaim(input) {
  const domain = clean(input.domain, 253).toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const contact = clean(input.contact, 254);
  const evidenceUrls = Array.isArray(input.evidenceUrls) ? input.evidenceUrls.map((url) => clean(url, 1000)).filter((url) => /^https:\/\//i.test(url)).slice(0, 10) : [];
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) throw new Error("A public company domain is required");
  if (!/^\S+@\S+\.\S+$/.test(contact)) throw new Error("A work contact email is required");
  if (!evidenceUrls.length) throw new Error("At least one public HTTPS evidence URL is required");
  const claim = { id: randomUUID(), domain, contact, evidenceUrls, statement: clean(input.statement, 4000), status: "submitted", submittedAt: new Date().toISOString(), review: null };
  const claims = await readClaims();
  claims.unshift(claim);
  await writeClaims(claims.slice(0, 1000));
  return { id: claim.id, status: claim.status };
}
