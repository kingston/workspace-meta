import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PluginContext } from '#src/types/config.js';

import { runPluginTestWrapper } from '#src/tests/plugin-context.test-helper.js';

import { conditionalFile } from './conditional-file.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

describe('conditionalFile', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should write file when condition is true', async () => {
    const condition = vi.fn(() => true);
    const plugin = conditionalFile(condition, 'test.txt', 'Hello World');

    const result = await runPluginTestWrapper(plugin);

    expect(condition).toHaveBeenCalledWith(result.context);
    expect(result.files).toEqual({
      'test.txt': 'Hello World',
    });
  });

  it('should not write file when condition is false', async () => {
    const condition = vi.fn(() => false);
    const plugin = conditionalFile(condition, 'test.txt', 'Hello World');
    const result = await runPluginTestWrapper(plugin);

    expect(condition).toHaveBeenCalledWith(result.context);
    expect(result.files).toEqual({});
  });

  it('should handle async conditions', async () => {
    const condition = vi.fn(() => Promise.resolve(true));
    const plugin = conditionalFile(condition, 'test.txt', 'Hello World');
    const result = await runPluginTestWrapper(plugin);

    expect(condition).toHaveBeenCalledWith(result.context);
    expect(result.files).toEqual({
      'test.txt': 'Hello World',
    });
  });

  it('should handle content as function', async () => {
    const condition = vi.fn(() => true);
    const content = vi.fn((ctx: PluginContext) => `Hello ${ctx.packageName}`);

    const plugin = conditionalFile(condition, 'test.txt', content);
    const result = await runPluginTestWrapper(plugin, {
      packageName: 'my-custom-package',
    });

    expect(content).toHaveBeenCalledWith(result.context);
    expect(result.files).toEqual({
      'test.txt': 'Hello my-custom-package',
    });
  });

  it('should handle async content functions', async () => {
    const condition = vi.fn(() => true);
    const content = vi.fn(async (ctx: PluginContext) => {
      const config = await ctx.readFile('config.json');
      return `Config: ${config}`;
    });

    const plugin = conditionalFile(condition, 'output.txt', content);
    const result = await runPluginTestWrapper(plugin, {
      files: {
        'config.json': '{"theme": "dark"}',
      },
    });

    expect(content).toHaveBeenCalledWith(result.context);
    expect(result.files).toEqual({
      'config.json': '{"theme": "dark"}',
      'output.txt': 'Config: {"theme": "dark"}',
    });
  });
});
