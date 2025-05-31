import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkspaceMetaConfig } from '#src/types/config.js';

import { hasConfig, loadConfig } from './config-loader.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

const jitiMocks = vi.hoisted(() => ({
  mockImport: vi.fn(),
}));

vi.mock('jiti', () => ({
  createJiti: () => ({
    import: jitiMocks.mockImport,
  }),
}));

describe('config-loader', () => {
  const workspaceRoot = '/workspace';
  const validConfig: WorkspaceMetaConfig = {
    plugins: [() => Promise.resolve()],
  };
  const { mockImport } = jitiMocks;

  beforeEach(() => {
    vol.reset();
    mockImport.mockReset();
  });

  it('should return undefined when no config file exists', async () => {
    const config = await loadConfig(workspaceRoot);
    expect(config).toBeUndefined();
  });

  it('should load config from .js file', async () => {
    vol.fromJSON({
      '/workspace/.workspace-meta/config.js': 'export default {}',
    });

    mockImport.mockResolvedValueOnce(validConfig);

    const config = await loadConfig(workspaceRoot);
    expect(config).toEqual(validConfig);
  });

  it('should load config from .ts file', async () => {
    vol.fromJSON({
      '/workspace/.workspace-meta/config.ts': 'export default {}',
    });

    mockImport.mockResolvedValueOnce(validConfig);

    const config = await loadConfig(workspaceRoot);
    expect(config).toEqual(validConfig);
  });

  it('should throw error for invalid config structure', async () => {
    vol.fromJSON({
      '/workspace/.workspace-meta/config.js': 'export default {}',
    });

    mockImport.mockResolvedValueOnce({});

    await expect(loadConfig(workspaceRoot)).rejects.toThrow(
      'Configuration must have a "plugins" array',
    );
  });

  it('should throw error for non-function plugins', async () => {
    const invalidConfig = {
      plugins: ['not-a-function'],
    };

    vol.fromJSON({
      '/workspace/.workspace-meta/config.js': 'export default {}',
    });

    mockImport.mockResolvedValueOnce(invalidConfig);

    await expect(loadConfig(workspaceRoot)).rejects.toThrow(
      'All plugins must be functions',
    );
  });

  it('should check if config exists', async () => {
    expect(await hasConfig(workspaceRoot)).toBe(false);

    vol.fromJSON({
      '/workspace/.workspace-meta/config.js': 'export default {}',
    });

    expect(await hasConfig(workspaceRoot)).toBe(true);
  });
});
