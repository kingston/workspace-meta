import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runPluginTestWrapper } from '#src/tests/plugin-context.test-helper.js';

import { updateJsonFile } from './update-json-file.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

beforeEach(() => {
  vol.reset();
});

describe('updateJsonFile', () => {
  it('should update existing JSON file', async () => {
    const updater = vi.fn((content: Record<string, unknown>) => ({
      ...content,
      description: 'Updated description',
    }));

    const result = await runPluginTestWrapper(
      updateJsonFile('config.json', updater),
      {
        files: {
          'config.json': JSON.stringify({
            name: 'test-package',
            version: '1.0.0',
          }),
        },
      },
    );

    expect(updater).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test-package',
        version: '1.0.0',
      }),
      expect.any(Object),
    );

    const fileContent = result.files['config.json'] ?? '';
    expect(JSON.parse(fileContent)).toEqual({
      name: 'test-package',
      version: '1.0.0',
      description: 'Updated description',
    });
  });

  it('should create new JSON file with default content', async () => {
    const defaultContent = {
      name: 'test-package',
      version: '1.0.0',
    };

    const updater = vi.fn((content: Record<string, unknown>) => ({
      ...content,
      description: 'New description',
    }));

    const result = await runPluginTestWrapper(
      updateJsonFile('config.json', updater, defaultContent),
    );

    expect(updater).toHaveBeenCalledWith(defaultContent, expect.any(Object));

    const fileContent = result.files['config.json'] ?? '';
    expect(JSON.parse(fileContent)).toEqual({
      name: 'test-package',
      version: '1.0.0',
      description: 'New description',
    });
  });

  it('should not write file if updater returns undefined', async () => {
    const updater = vi.fn(() => undefined);

    const result = await runPluginTestWrapper(
      updateJsonFile('config.json', updater),
      {
        files: {},
      },
    );

    expect(result.files['config.json']).toBeUndefined();
  });

  it('should throw error if existing file is invalid JSON', async () => {
    const updater = vi.fn((content: Record<string, unknown>) => content);

    await expect(
      runPluginTestWrapper(updateJsonFile('config.json', updater), {
        files: {
          'config.json': 'invalid json',
        },
      }),
    ).rejects.toThrow('Failed to parse JSON file config.json');
  });

  it('should handle async updater functions', async () => {
    const updater = vi.fn(async (content: Record<string, unknown>) => {
      const config = await Promise.resolve({
        ...content,
        description: 'Async updated',
      });
      return config;
    });

    const result = await runPluginTestWrapper(
      updateJsonFile('config.json', updater),
      {
        files: {
          'config.json': JSON.stringify({
            name: 'test-package',
            version: '1.0.0',
          }),
        },
      },
    );

    expect(updater).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test-package',
        version: '1.0.0',
      }),
      expect.any(Object),
    );

    const fileContent = result.files['config.json'] ?? '';
    expect(JSON.parse(fileContent)).toEqual({
      name: 'test-package',
      version: '1.0.0',
      description: 'Async updated',
    });
  });
});
