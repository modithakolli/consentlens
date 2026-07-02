import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(MODULE_DIR, "../data");
const DATA_PATH = resolve(DATA_DIR, "tracker-observations.json");

function normalizeHost(hostname) {
  return String(hostname || "").replace(/^www\./, "").toLowerCase();
}

async function readArchive() {
  try {
    const raw = await readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

async function writeArchive(entries) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(entries, null, 2), "utf8");
}

function mergeEntry(existing, next) {
  const observedSites = Array.from(new Set([
    ...(existing?.observedSites || []),
    ...(next?.observedSites || [])
  ])).slice(0, 12);

  return {
    host: next.host,
    company: next.company || existing?.company || "Observed tracker",
    category: next.category || existing?.category || "unknown",
    risk: next.risk || existing?.risk || "unknown",
    purpose: next.purpose || existing?.purpose || "Seen on multiple sites",
    hq: next.hq || existing?.hq || "Unknown",
    reputation: next.reputation || existing?.reputation || "Unknown",
    known: Boolean(next.known || existing?.known),
    firstSeen: existing?.firstSeen || next.firstSeen || Date.now(),
    lastSeen: next.lastSeen || Date.now(),
    observedSites,
    requests: (existing?.requests || 0) + (next.requests || 0)
  };
}

export async function recordTrackerObservations(pageHost, observations) {
  const archive = await readArchive();
  const map = new Map(archive.map((entry) => [entry.host, entry]));

  (Array.isArray(observations) ? observations : []).forEach((observation) => {
    const host = normalizeHost(observation?.host);
    if (!host) return;

    const current = map.get(host) || null;
    const next = mergeEntry(current, {
      host,
      company: observation.company,
      category: observation.category,
      risk: observation.risk,
      purpose: observation.purpose,
      hq: observation.hq,
      reputation: observation.reputation,
      known: Boolean(observation.known),
      firstSeen: current?.firstSeen || Date.now(),
      lastSeen: Date.now(),
      observedSites: [...(current?.observedSites || []), pageHost].filter(Boolean),
      requests: Number(observation.requests || 0)
    });

    map.set(host, next);
  });

  const nextArchive = Array.from(map.values())
    .sort((a, b) => (b.requests || 0) - (a.requests || 0) || (b.lastSeen || 0) - (a.lastSeen || 0))
    .slice(0, 1000);

  await writeArchive(nextArchive);
  return nextArchive;
}

export async function getTrackerObservations() {
  return readArchive();
}
