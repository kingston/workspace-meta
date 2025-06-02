import { vol } from 'memfs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runPluginTestWrapper } from '#src/tests/plugin-context.test-helper.js';

import { ensureFileFromTemplate } from './ensure-file-from-template.js';

vi.mock('node:fs');
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

describe('ensureFileFromTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vol.reset();
  });
  it('should read template file from config directory and write to package', async () => {
    const mockReadFile = vi.mocked(readFile);
    const templateContent = 'This is template content';

    mockReadFile.mockResolvedValue(templateContent);

    const plugin = ensureFileFromTemplate(
      '.eslintrc.json',
      'templates/eslintrc.json',
    );

    const result = await runPluginTestWrapper(plugin, {
      packagePath: '/workspace/packages/test',
      packageName: 'test',
      configDirectory: '/workspace/config',
    });

    expect(mockReadFile).toHaveBeenCalledWith(
      path.resolve('/workspace/config', 'templates/eslintrc.json'),
      'utf8',
    );
    expect(result.files).toEqual({
      '.eslintrc.json': templateContent,
    });
  });

  it('should handle absolute template paths correctly', async () => {
    const mockReadFile = vi.mocked(readFile);
    const templateContent = 'Template content';

    mockReadFile.mockResolvedValue(templateContent);

    const plugin = ensureFileFromTemplate(
      'config.json',
      '../shared/config.json',
    );

    const result = await runPluginTestWrapper(plugin, {
      packagePath: '/workspace/packages/test',
      packageName: 'test',
      configDirectory: '/workspace/.config',
    });

    expect(mockReadFile).toHaveBeenCalledWith(
      path.resolve('/workspace/.config', '../shared/config.json'),
      'utf8',
    );
    expect(result.files).toEqual({
      'config.json': templateContent,
    });
  });

  it('should throw error if template file cannot be read', async () => {
    const mockReadFile = vi.mocked(readFile);

    mockReadFile.mockRejectedValue(new Error('File not found'));

    const plugin = ensureFileFromTemplate(
      'output.txt',
      'templates/missing.txt',
    );

    await expect(
      runPluginTestWrapper(plugin, {
        packagePath: '/workspace/packages/test',
        packageName: 'test',
        configDirectory: '/workspace/config',
      }),
    ).rejects.toThrow(
      'Failed to read template file "templates/missing.txt" from config directory: File not found',
    );
  });

  it('should handle non-Error exceptions when reading template', async () => {
    const mockReadFile = vi.mocked(readFile);

    mockReadFile.mockRejectedValue('Unknown error');

    const plugin = ensureFileFromTemplate('output.txt', 'template.txt');

    await expect(
      runPluginTestWrapper(plugin, {
        packagePath: '/workspace/packages/test',
        packageName: 'test',
        configDirectory: '/workspace/config',
      }),
    ).rejects.toThrow(
      'Failed to read template file "template.txt" from config directory: Unknown error',
    );
  });
});
