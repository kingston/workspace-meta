import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PluginContext } from '#src/types/config.js';

import { runPluginTestWrapper } from '#src/tests/plugin-context.test-helper.js';

import { ensureFile } from './ensure-file.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

beforeEach(() => {
  vol.reset();
});

describe('ensureFile', () => {
  it('should write static content to file', async () => {
    const result = await runPluginTestWrapper(
      ensureFile('test.txt', 'Hello World'),
    );
    expect(result.files).toEqual({
      'test.txt': 'Hello World',
    });
  });

  it('should handle content as function', async () => {
    const content = vi.fn((ctx: PluginContext) => `Hello ${ctx.packageName}`);
    const result = await runPluginTestWrapper(ensureFile('test.txt', content), {
      packageName: 'my-custom-package',
    });

    expect(content).toHaveBeenCalledWith(result.context);
    expect(result.files).toEqual({
      'test.txt': 'Hello my-custom-package',
    });
  });

  it('should handle async content functions', async () => {
    const content = vi.fn(async (ctx: PluginContext) => {
      const config = await ctx.readFile('config.json');
      return `Config: ${config}`;
    });

    const result = await runPluginTestWrapper(
      ensureFile('output.txt', content),
      {
        files: {
          'config.json': '{"theme": "dark"}',
        },
      },
    );

    expect(content).toHaveBeenCalledWith(result.context);
    expect(result.files).toEqual({
      'config.json': '{"theme": "dark"}',
      'output.txt': 'Config: {"theme": "dark"}',
    });
  });
});
