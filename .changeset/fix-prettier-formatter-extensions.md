---
'workspace-meta': patch
---

Fix prettier formatter to only format files that Prettier can parse. The formatter now uses Prettier's `getFileInfo` API to check if a file has an inferred parser before attempting to format it, preventing errors on unsupported file types.
