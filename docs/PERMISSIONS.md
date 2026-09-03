# Extension permissions

Productivity Police requests Chrome permissions only when an implemented adapter needs them. Every addition must include an automated manifest assertion and a documented reason.

| Permission | Introduced by | Reason                                                                                                                                                                     |
| ---------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`  | PP-003        | Persist the versioned local-first envelope in `chrome.storage.local`; future session-bound runtime state uses `chrome.storage.session` through the same Chrome permission. |

No host permission is required by the L01 foundation.
