import type { PackageJson } from 'pkg-types';

import { describe, expect, it, vi } from 'vitest';

import { runPluginTestWrapper } from '#src/tests/plugin-context.test-helper.js';

import { ensurePackageJson } from './ensure-package-json.js';

describe('ensurePackageJson', () => {
  it('should update package.json with the provided updater', async () => {
    const updater = vi.fn(
      (pkg: PackageJson): PackageJson => ({
        ...pkg,
        description: 'Test description',
      }),
    );

    const result = await runPluginTestWrapper(ensurePackageJson(updater), {
      packageJson: {
        name: 'test-package',
        version: '1.0.0',
      },
    });

    expect(updater).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test-package',
        version: '1.0.0',
      }),
    );

    const packageJsonContents = result.files['package.json'] ?? '';

    expect(JSON.parse(packageJsonContents)).toEqual({
      name: 'test-package',
      version: '1.0.0',
      description: 'Test description',
    });
  });
});
