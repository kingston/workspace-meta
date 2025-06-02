---
'workspace-meta': patch
---

Add ensureFileFrom helper and configDirectory to PluginContext. The ensureFileFrom helper allows copying template files from the config directory, and all plugins now have access to the configDirectory path (inferred as `${workspacePath}/.workspace-meta`) in the plugin context.
