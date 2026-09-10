# ConsentLens extension privacy and permissions

ConsentLens scans locally by default. Scan history, policy snapshots, consent receipts, tracker observations, and Q&A history are stored in `chrome.storage.local` on the user’s device.

The optional local backend is used only for deeper policy analysis, public source-backed profiles, company claims, and reviewer workflows. Aggregate tracker observations are sent only after the user explicitly enables **Share aggregate tracker observations** in Options. They contain provider/domain classifications and request counts; they do not include the visited page URL or a user identity.

| Permission | Why it remains | User-visible behavior |
| --- | --- | --- |
| `storage` | Save local history and settings | The popup displays and allows clearing local records. |
| `activeTab` | Scan the current tab when the popup opens | ConsentLens does not need background access to tab content. |
| `scripting` | Re-run scanners in the active tab after a popup refresh | Used only following a user action. |
| `webRequest` + site host access | Observe third-party requests needed for tracker explanations | No request bodies, credentials, or page form content are read. |
| site host access | Run local consent, OAuth, and policy-link detection | Required for whole-web scanner coverage; reduce to optional/site-selected access before public release. |

`tabs` is not required and has been removed. Before an external release, replace broad all-site access with user-selectable site access or optional host permissions, then repeat the 50–100-site validation run.
