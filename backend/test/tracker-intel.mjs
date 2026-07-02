import assert from "node:assert/strict";
import { getDomainIntel, getTrackerIntel, lookupDomain } from "../src/domainIntel.js";

const googleAnalytics = lookupDomain("www.google-analytics.com");
assert.equal(googleAnalytics.known, true, "Google Analytics should be known");
assert.equal(googleAnalytics.company, "Google");
assert.equal(googleAnalytics.category, "analytics");
assert.equal(googleAnalytics.risk, "medium");

const metaPixel = lookupDomain("connect.facebook.net");
assert.equal(metaPixel.company, "Meta Platforms");
assert.equal(metaPixel.category, "ads");
assert.equal(metaPixel.risk, "high");

const intel = getDomainIntel(["google-analytics.com", "connect.facebook.net"]);
assert.equal(intel.length, 2, "Expected two tracker intelligence rows");

const trackerIntel = getTrackerIntel();
assert.ok(trackerIntel.length >= 10, "Tracker intelligence database should contain multiple records");

console.log("Backend tracker intelligence smoke tests passed.");
