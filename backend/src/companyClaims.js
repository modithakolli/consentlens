import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dns from "node:dns/promises";
import { randomBytes } from "node:crypto";

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
  const challengeToken = `consentlens=${randomBytes(18).toString("base64url")}`;
  const claim = { id: randomUUID(), domain, contact, evidenceUrls, statement: clean(input.statement, 4000), status: "pending_domain_verification", submittedAt: new Date().toISOString(), challenge: { record: `_consentlens-verify.${domain}`, token: challengeToken, verifiedAt: null }, review: null };
  const claims = await readClaims();
  claims.unshift(claim);
  await writeClaims(claims.slice(0, 1000));
  return { id: claim.id, status: claim.status, challenge: claim.challenge };
}

export async function verifyClaimDomain(id) {
  const claims = await readClaims();
  const claim = claims.find((item) => item.id === clean(id, 100));
  if (!claim) throw new Error("Claim not found");
  if (claim.status === "claimed") return { id: claim.id, status: claim.status };
  const records = await dns.resolveTxt(claim.challenge.record);
  const values = records.map((parts) => parts.join(""));
  if (!values.includes(claim.challenge.token)) throw new Error(`TXT record ${claim.challenge.record} does not contain the required token`);
  claim.status = "claimed";
  claim.challenge.verifiedAt = new Date().toISOString();
  await writeClaims(claims);
  return { id: claim.id, status: claim.status, verifiedAt: claim.challenge.verifiedAt };
}

export async function reviewerClaims() {
  return (await readClaims()).map(({ contact, ...claim }) => ({ ...claim, contact: contact.replace(/^(.{1,2}).*(@.*)$/, "$1…$2") }));
}
