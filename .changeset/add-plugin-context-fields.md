---
'workspace-meta': patch
---

Add configDirectory and workspacePackages fields to PluginContext. Plugins now have access to:

- configDirectory: The path to the config directory (inferred as `${workspacePath}/.workspace-meta`)
- workspacePackages: Information about all packages in the workspace, allowing plugins to reference other packages
