import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { ensureFileFrom } from './ensure-file-from.js';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

describe('ensureFileFrom', () => {
  it('should read template file from config directory and write to package', async () => {
    const mockReadFile = vi.mocked(readFile);
    const mockWriteFile = vi.fn();
    const templateContent = 'This is template content';

    mockReadFile.mockResolvedValue(templateContent);

    const plugin = ensureFileFrom('.eslintrc.json', 'templates/eslintrc.json');

    const ctx = {
      workspacePath: '/workspace',
      packagePath: '/workspace/packages/test',
      packageName: 'test',
      packageJson: { name: 'test' },
      configDirectory: '/workspace/config',
      isCheckMode: false,
      readFile: vi.fn(),
      writeFile: mockWriteFile,
    };

    await plugin(ctx);

    expect(mockReadFile).toHaveBeenCalledWith(
      path.resolve('/workspace/config', 'templates/eslintrc.json'),
      'utf8',
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      '.eslintrc.json',
      templateContent,
    );
  });

  it('should handle absolute template paths correctly', async () => {
    const mockReadFile = vi.mocked(readFile);
    const mockWriteFile = vi.fn();
    const templateContent = 'Template content';

    mockReadFile.mockResolvedValue(templateContent);

    const plugin = ensureFileFrom('config.json', '../shared/config.json');

    const ctx = {
      workspacePath: '/workspace',
      packagePath: '/workspace/packages/test',
      packageName: 'test',
      packageJson: { name: 'test' },
      configDirectory: '/workspace/.config',
      isCheckMode: false,
      readFile: vi.fn(),
      writeFile: mockWriteFile,
    };

    await plugin(ctx);

    expect(mockReadFile).toHaveBeenCalledWith(
      path.resolve('/workspace/.config', '../shared/config.json'),
      'utf8',
    );
    expect(mockWriteFile).toHaveBeenCalledWith('config.json', templateContent);
  });

  it('should throw error if template file cannot be read', async () => {
    const mockReadFile = vi.mocked(readFile);
    const mockWriteFile = vi.fn();

    mockReadFile.mockRejectedValue(new Error('File not found'));

    const plugin = ensureFileFrom('output.txt', 'templates/missing.txt');

    const ctx = {
      workspacePath: '/workspace',
      packagePath: '/workspace/packages/test',
      packageName: 'test',
      packageJson: { name: 'test' },
      configDirectory: '/workspace/config',
      isCheckMode: false,
      readFile: vi.fn(),
      writeFile: mockWriteFile,
    };

    await expect(plugin(ctx)).rejects.toThrow(
      'Failed to read template file "templates/missing.txt" from config directory: File not found',
    );

    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('should handle non-Error exceptions when reading template', async () => {
    const mockReadFile = vi.mocked(readFile);
    const mockWriteFile = vi.fn();

    mockReadFile.mockRejectedValue('Unknown error');

    const plugin = ensureFileFrom('output.txt', 'template.txt');

    const ctx = {
      workspacePath: '/workspace',
      packagePath: '/workspace/packages/test',
      packageName: 'test',
      packageJson: { name: 'test' },
      configDirectory: '/workspace/config',
      isCheckMode: false,
      readFile: vi.fn(),
      writeFile: mockWriteFile,
    };

    await expect(plugin(ctx)).rejects.toThrow(
      'Failed to read template file "template.txt" from config directory: Unknown error',
    );
  });
});