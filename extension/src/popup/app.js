// Popup entry point. Feature modules progressively replace the legacy renderer below.
// Keeping the legacy import here preserves the shipped UI while extraction happens in small, testable steps.
import "./state.js";
import "./dom.js";
import "./api.js";
import "./risk.js";
import "./oauth.js";
import "./graph.js";
import "./timeline.js";
import "./receipts.js";
import "./fingerprinting.js";
import "./dsar.js";
import "../popup.js";
