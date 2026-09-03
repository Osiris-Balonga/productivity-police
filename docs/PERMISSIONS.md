# Extension permissions

Productivity Police requests Chrome permissions only when an implemented adapter needs them. Every addition must include an automated manifest assertion and a documented reason.

| Permission | Introduced by | Reason                                                                                                                                                                     |
| ---------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`  | PP-003        | Persist the versioned local-first envelope in `chrome.storage.local`; future session-bound runtime state uses `chrome.storage.session` through the same Chrome permission. |
| `tabs`     | PP-031        | Identify the active tab and its domain so only one eligible blacklisted tab can consume allowance.                                                                         |
| `idle`     | PP-031        | Stop distraction accounting while Chrome reports that the user is idle.                                                                                                    |
| `alarms`   | PP-031        | Run a bounded heartbeat that consolidates observed accounting while the Manifest V3 service worker is alive.                                                               |

No host permission is required: the runtime reads tab metadata in the background and does not inject into arbitrary pages.
