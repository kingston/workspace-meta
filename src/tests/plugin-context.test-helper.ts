import type { PackageJson } from 'pkg-types';

import { vol } from 'memfs';
import path from 'node:path';
import { vi } from 'vitest';

import type { Plugin, PluginContext } from '#src/types/config.js';

import { handleFileNotFoundError } from '#src/utils/handle-not-found-error.js';

export interface MockPluginContextOptions {
  workspacePath?: string;
  packagePath?: string;
  packageName?: string;
  packageJson?: PackageJson;
  isCheckMode?: boolean;
  files?: Record<string, string>;
}

/**
 * Creates a mock plugin context for testing plugins
 * Uses memfs to provide a virtual file system
 *
 * Default values are:
 * - workspacePath: '/workspace'
 * - packagePath: '/workspace/packages/test-package'
 * - packageName: 'test-package'
 * - packageJson: { name: 'test-package', version: '1.0.0' }
 * - isCheckMode: false
 * - files: {}
 */
export function createMockPluginContext(
  options: MockPluginContextOptions = {},
): PluginContext {
  const {
    workspacePath = '/workspace',
    packagePath = '/workspace/packages/test-package',
    packageName = 'test-package',
    packageJson = { name: packageName, version: '1.0.0' },
    isCheckMode = false,
    files = {},
  } = options;

  vol.fromJSON(
    Object.fromEntries(
      Object.entries(files).map(([key, value]) => [
        path.join(packagePath, key),
        value,
      ]),
    ),
    packagePath,
  );

  const context: PluginContext = {
    workspacePath,
    packagePath,
    packageName,
    packageJson,
    isCheckMode,
    readFile: vi.fn((relativePath: string) => {
      const fullPath = path.join(packagePath, relativePath);
      return vol.promises
        .readFile(fullPath, 'utf8')
        .catch(handleFileNotFoundError) as Promise<string | undefined>;
    }),
    writeFile: vi.fn(
      async (relativePath: string, content: string): Promise<void> => {
        if (!isCheckMode) {
          const fullPath = path.join(packagePath, relativePath);
          const dir = path.dirname(fullPath);

          // Ensure directory exists
          vol.mkdirSync(dir, { recursive: true });
          await vol.promises.writeFile(fullPath, content);
        }
      },
    ),
  };

  return context;
}

interface PluginTestRunnerResult {
  context: PluginContext;
  files: Record<string, string | null>;
}

export async function runPluginTestWrapper(
  plugin: Plugin,
  options: MockPluginContextOptions = {},
): Promise<PluginTestRunnerResult> {
  const context = createMockPluginContext(options);
  await Promise.resolve(plugin(context));

  return {
    context,
    files: Object.fromEntries(
      Object.entries(vol.toJSON()).map(([key, value]) => [
        key.slice(context.packagePath.length + 1),
        value,
      ]),
    ),
  };
}
