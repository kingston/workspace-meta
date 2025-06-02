# workspace-meta

## 0.1.3

### Patch Changes

- 96a9f4a: Add ensureFileFromTemplate helper function that allows copying template files from the config directory to packages. This is useful for maintaining consistent configuration files across packages.
- 9ae0e68: Add configDirectory and workspacePackages fields to PluginContext. Plugins now have access to:

  - configDirectory: The path to the config directory (inferred as `${workspacePath}/.workspace-meta`)
  - workspacePackages: Information about all packages in the workspace, allowing plugins to reference other packages

- 92a3f7a: Remove preinstall script
- 0259ae9: Fix prettier formatter to only format files that Prettier can parse. The formatter now uses Prettier's `getFileInfo` API to check if a file has an inferred parser before attempting to format it, preventing errors on unsupported file types.

## 0.1.2

### Patch Changes

- 65f19e6: Fix tsc build to output to dist

## 0.1.1

### Patch Changes

- d9f795b: Always ask for custom package path
