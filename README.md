# workspace-meta

A CLI tool for managing and synchronizing configuration across monorepo workspaces. Supports pnpm, yarn, and lerna workspaces with a flexible plugin architecture.

## Installation

Install as a dev dependency at your workspace root:

```bash
pnpm add -Dw workspace-meta
# or
npm install -D workspace-meta
# or
yarn add -D workspace-meta
```

## Quick Start

1. **Initialize** workspace-meta in your monorepo:

   ```bash
   pnpm workspace-meta init
   ```

   Creates the `.workspace-meta/` directory and initial configuration file.

2. **Check** your workspace configuration:

   ```bash
   pnpm workspace-meta check
   ```

   Analyzes your workspace and shows what changes would be made without actually modifying files.

3. **Sync** configuration across all packages:

   ```bash
   pnpm workspace-meta sync
   ```

   Applies all configured plugins to synchronize configuration across your workspace packages.

4. **Generate** new packages with consistent setup:
   ```bash
   pnpm workspace-meta generate my-new-package
   ```
   Creates a new package with all your configured standards and templates applied.

## Configuration

Configuration is stored in `.workspace-meta/config.js` or `.workspace-meta/config.ts` at your workspace root.

### Basic Configuration

```javascript
// .workspace-meta/config.js
import { defineWorkspaceMetaConfig, ensurePackageJson } from 'workspace-meta';

export default defineWorkspaceMetaConfig({
  plugins: [
    ensurePackageJson((pkg) => ({
      ...pkg,
      license: 'MIT',
      author: 'Your Name',
      repository: {
        type: 'git',
        url: 'https://github.com/yourorg/yourrepo.git',
      },
    })),
  ],
});
```

### TypeScript Configuration

```typescript
// .workspace-meta/config.ts
import type { WorkspaceMetaConfig } from 'workspace-meta';
import {
  defineWorkspaceMetaConfig,
  ensurePackageJson,
  ensureFile,
} from 'workspace-meta';

export default defineWorkspaceMetaConfig({
  plugins: [
    // Ensure all packages have consistent package.json fields
    ensurePackageJson((pkg) => ({
      ...pkg,
      license: 'MIT',
      type: 'module',
      engines: {
        node: '>=18',
      },
    })),

    // Ensure all packages have a tsconfig.json
    ensureFile(
      'tsconfig.json',
      JSON.stringify(
        {
          extends: '../../tsconfig.base.json',
          compilerOptions: {
            outDir: './dist',
          },
        },
        null,
        2,
      ),
    ),
  ],

  // Optional: Custom formatter for code formatting
  formatter: async (content, filename) => {
    // Use your preferred formatter (prettier, biome, etc.)
    return content;
  },
}) satisfies WorkspaceMetaConfig;
```

## Commands

### `workspace-meta init`

Initialize workspace-meta in your monorepo. Creates the configuration directory and basic setup.

```bash
workspace-meta init [options]

Options:
  --cwd <path>    Working directory (default: current directory)
  -h, --help      Display help
```

### `workspace-meta check`

Check workspace configuration without making changes. Shows what would be updated.

```bash
workspace-meta check [options]

Options:
  --cwd <path>    Working directory (default: current directory)
  -h, --help      Display help
```

### `workspace-meta sync`

Synchronize configuration across all workspace packages. Applies all configured plugins.

```bash
workspace-meta sync [options]

Options:
  --cwd <path>    Working directory (default: current directory)
  -h, --help      Display help
```

### `workspace-meta generate <name>`

Generate a new package with consistent configuration.

```bash
workspace-meta generate <name> [options]

Arguments:
  name            Package name

Options:
  --cwd <path>    Working directory (default: current directory)
  -h, --help      Display help
```

## Supported Workspace Types

- **pnpm**: Detects `pnpm-workspace.yaml`
- **yarn**: Detects `package.json` with `workspaces` field
- **lerna**: Detects `lerna.json`

## Built-in Helpers

### `ensurePackageJson(updater)`

Ensures package.json exists and updates it with the provided function.

```javascript
ensurePackageJson((pkg) => ({
  ...pkg,
  license: 'MIT',
  scripts: {
    ...pkg.scripts,
    build: 'tsc',
    test: 'vitest',
  },
}));
```

### `ensureFile(path, content)`

Ensures a file exists with the specified content.

```javascript
// Static content
ensureFile('.gitignore', 'node_modules/\ndist/\n');

// Dynamic content based on context
ensureFile('README.md', (ctx) => `# ${ctx.packageName}\n\nDescription here.`);
```

### `conditionalFile(condition, path, content)`

Conditionally creates a file based on a predicate.

```javascript
conditionalFile(
  (ctx) => ctx.packageJson.scripts?.test,
  '.github/workflows/test.yml',
  testWorkflowContent,
);
```

### `copyFile(source, destination)`

Copies a file from source to destination.

```javascript
copyFile('templates/tsconfig.json', 'tsconfig.json');
```

### `updateJsonFile(path, updater)`

Updates a JSON file with the provided updater function.

```javascript
updateJsonFile('package.json', (pkg) => ({
  ...pkg,
  version: '1.0.0',
}));
```

### `ensureFileFromTemplate(templatePath, destination)`

Creates a file from a template with variable substitution.

```javascript
ensureFileFromTemplate('templates/package.json.template', 'package.json');
```

## Custom Formatters

You can provide a custom formatter function to format generated files.

### Built-in Prettier Formatter

workspace-meta includes a pre-made Prettier formatter that you can use:

```javascript
import { defineWorkspaceMetaConfig, prettierFormatter } from 'workspace-meta';

export default defineWorkspaceMetaConfig({
  formatter: prettierFormatter,
  plugins: [
    /* ... */
  ],
});
```

The `prettierFormatter` will:

- Automatically detect and use your existing Prettier configuration
- Gracefully handle cases where Prettier is not installed
- Format files according to their file extension
- Fall back to original content if formatting fails

### Custom Formatter

You can also create your own formatter function:

```javascript
import prettier from 'prettier';

export default defineWorkspaceMetaConfig({
  plugins: [
    /* ... */
  ],
  formatter: async (content, filename) => {
    if (filename.endsWith('.json')) {
      return prettier.format(content, { parser: 'json' });
    }
    if (filename.endsWith('.js') || filename.endsWith('.ts')) {
      return prettier.format(content, { parser: 'typescript' });
    }
    return content;
  },
});
```

## Plugin Context

Plugins receive a context object with useful information and utilities:

```typescript
interface PluginContext {
  packageName: string; // Current package name
  packagePath: string; // Absolute path to package
  workspaceRoot: string; // Absolute path to workspace root
  packageJson: PackageJson; // Current package.json content
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  fileExists(path: string): Promise<boolean>;
}
```

## Examples

### Ensure TypeScript Configuration

```javascript
export default defineWorkspaceMetaConfig({
  plugins: [
    ensureFile('tsconfig.json', {
      extends: '../../tsconfig.base.json',
      compilerOptions: {
        outDir: './dist',
        rootDir: './src',
      },
    }),
    ensurePackageJson((pkg) => ({
      ...pkg,
      main: './dist/index.js',
      types: './dist/index.d.ts',
      scripts: {
        ...pkg.scripts,
        build: 'tsc',
        dev: 'tsc --watch',
      },
    })),
  ],
});
```

### Ensure Consistent Linting

```javascript
export default defineWorkspaceMetaConfig({
  plugins: [
    copyFile('../../.eslintrc.json', '.eslintrc.json'),
    ensurePackageJson((pkg) => ({
      ...pkg,
      scripts: {
        ...pkg.scripts,
        lint: 'eslint src',
        'lint:fix': 'eslint src --fix',
      },
    })),
  ],
});
```

## License

MIT
