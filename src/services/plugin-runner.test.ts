import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Package } from '#src/services/workspace-discovery.js';
import type { Plugin, WorkspaceMetaConfig } from '#src/types/config.js';

import { PluginRunner } from './plugin-runner.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

describe('PluginRunner', () => {
  const workspacePath = '/workspace';
  const mockPackage: Package = {
    name: 'test-package',
    path: '/workspace/packages/test-package',
    packageJson: {
      name: 'test-package',
      version: '1.0.0',
    },
  };

  beforeEach(() => {
    vol.reset();
    vi.clearAllMocks();
  });

  describe('runPluginsForPackage', () => {
    it('should execute plugins sequentially', async () => {
      const plugin1 = vi.fn();
      const plugin2 = vi.fn();
      const config: WorkspaceMetaConfig = {
        plugins: [plugin1, plugin2],
      };

      const runner = new PluginRunner(workspacePath, config);
      const result = await runner.runPluginsForPackage(mockPackage, {
        isCheckMode: false,
      });

      expect(plugin1).toHaveBeenCalledBefore(plugin2);
      expect(plugin1).toHaveBeenCalledWith(
        expect.objectContaining({
          workspacePath,
          packagePath: mockPackage.path,
          packageName: mockPackage.name,
          packageJson: mockPackage.packageJson,
          isCheckMode: false,
        }),
      );
      expect(result.packageName).toBe('test-package');
      expect(result.errors).toHaveLength(0);
    });

    it('should catch and report plugin errors', async () => {
      const errorPlugin: Plugin = () => {
        throw new Error('Plugin failed');
      };
      const config: WorkspaceMetaConfig = {
        plugins: [errorPlugin],
      };

      const runner = new PluginRunner(workspacePath, config);
      const result = await runner.runPluginsForPackage(mockPackage, {
        isCheckMode: false,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('Plugin error: Plugin failed');
    });

    it('should provide readFile function that reads files', async () => {
      vol.fromJSON({
        '/workspace/packages/test-package/README.md': '# Test Package',
      });

      const plugin = vi.fn<Plugin>();
      const config: WorkspaceMetaConfig = {
        plugins: [plugin],
      };

      const runner = new PluginRunner(workspacePath, config);
      await runner.runPluginsForPackage(mockPackage, {
        isCheckMode: false,
      });

      const context = plugin.mock.calls[0][0];
      const content = await context.readFile('README.md');
      expect(content).toBe('# Test Package');
    });

    it('should return undefined for non-existent files', async () => {
      const plugin = vi.fn<Plugin>();
      const config: WorkspaceMetaConfig = {
        plugins: [plugin],
      };

      const runner = new PluginRunner(workspacePath, config);
      await runner.runPluginsForPackage(mockPackage, {
        isCheckMode: false,
      });

      const context = plugin.mock.calls[0][0];
      const content = await context.readFile('non-existent.txt');
      expect(content).toBeUndefined();
    });

    describe('check mode', () => {
      it('should detect file changes without writing', async () => {
        vol.fromJSON({
          '/workspace/packages/test-package/package.json': JSON.stringify({
            name: 'test-package',
            version: '1.0.0',
          }),
        });

        const plugin: Plugin = async (ctx) => {
          await ctx.writeFile(
            'package.json',
            JSON.stringify({ name: 'test-package', version: '2.0.0' }),
          );
        };
        const config: WorkspaceMetaConfig = {
          plugins: [plugin],
        };

        const runner = new PluginRunner(workspacePath, config);
        const result = await runner.runPluginsForPackage(mockPackage, {
          isCheckMode: true,
        });

        expect(result.filesChanged).toEqual(['package.json']);

        // Verify file was not actually written
        const fileContent = vol.readFileSync(
          '/workspace/packages/test-package/package.json',
          'utf8',
        );
        expect(
          (JSON.parse(fileContent as string) as { version: string }).version,
        ).toBe('1.0.0');
      });

      it('should not report changes when content is identical', async () => {
        const content = JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
        });
        vol.fromJSON({
          '/workspace/packages/test-package/package.json': content,
        });

        const plugin: Plugin = async (ctx) => {
          await ctx.writeFile('package.json', content);
        };
        const config: WorkspaceMetaConfig = {
          plugins: [plugin],
        };

        const runner = new PluginRunner(workspacePath, config);
        const result = await runner.runPluginsForPackage(mockPackage, {
          isCheckMode: true,
        });

        expect(result.filesChanged).toHaveLength(0);
      });
    });

    describe('sync mode', () => {
      it('should write files in sync mode', async () => {
        // Create the directory structure
        vol.mkdirSync('/workspace/packages/test-package', { recursive: true });

        const plugin: Plugin = async (ctx) => {
          await ctx.writeFile('test.txt', 'Hello World');
        };
        const config: WorkspaceMetaConfig = {
          plugins: [plugin],
        };

        const runner = new PluginRunner(workspacePath, config);
        const result = await runner.runPluginsForPackage(mockPackage, {
          isCheckMode: false,
        });

        expect(result.filesChanged).toEqual(['test.txt']);

        const fileContent = vol.readFileSync(
          '/workspace/packages/test-package/test.txt',
          'utf8',
        );
        expect(fileContent).toBe('Hello World');
      });

      it('should prevent multiple writes to the same file', async () => {
        const plugin: Plugin = async (ctx) => {
          await ctx.writeFile('test.txt', 'First write');
          await expect(
            ctx.writeFile('test.txt', 'Second write'),
          ).rejects.toThrow(
            "File 'test.txt' has already been targeted for writing in this operation",
          );
        };
        const config: WorkspaceMetaConfig = {
          plugins: [plugin],
        };

        const runner = new PluginRunner(workspacePath, config);
        await runner.runPluginsForPackage(mockPackage, {
          isCheckMode: false,
        });
      });

      it('should normalize Windows paths', async () => {
        const plugin: Plugin = async (ctx) => {
          await ctx.writeFile(
            String.raw`src\components\Button.tsx`,
            'export default Button',
          );
          await expect(
            ctx.writeFile('src/components/Button.tsx', 'duplicate'),
          ).rejects.toThrow(
            "File 'src/components/Button.tsx' has already been targeted for writing",
          );
        };
        const config: WorkspaceMetaConfig = {
          plugins: [plugin],
        };

        const runner = new PluginRunner(workspacePath, config);
        await runner.runPluginsForPackage(mockPackage, {
          isCheckMode: false,
        });
      });

      it('should not commit writes when there are plugin errors', async () => {
        const plugin1: Plugin = async (ctx) => {
          await ctx.writeFile('test.txt', 'Should not be written');
        };
        const plugin2: Plugin = () => {
          throw new Error('Plugin failed');
        };
        const config: WorkspaceMetaConfig = {
          plugins: [plugin1, plugin2],
        };

        const runner = new PluginRunner(workspacePath, config);
        const result = await runner.runPluginsForPackage(mockPackage, {
          isCheckMode: false,
        });

        expect(result.errors).toHaveLength(1);
        expect(result.filesChanged).toHaveLength(0);

        // Verify file was not written
        expect(
          vol.existsSync('/workspace/packages/test-package/test.txt'),
        ).toBe(false);
      });
    });

    describe('formatter', () => {
      it('should apply formatter to changed files', async () => {
        vol.mkdirSync('/workspace/packages/test-package', { recursive: true });

        const formatter = vi.fn((content: string) => content.toUpperCase());
        const plugin: Plugin = async (ctx) => {
          await ctx.writeFile('test.txt', 'hello world');
        };
        const config: WorkspaceMetaConfig = {
          plugins: [plugin],
          formatter,
        };

        const runner = new PluginRunner(workspacePath, config);
        await runner.runPluginsForPackage(mockPackage, {
          isCheckMode: false,
        });

        expect(formatter).toHaveBeenCalledWith(
          'hello world',
          '/workspace/packages/test-package/test.txt',
        );

        const fileContent = vol.readFileSync(
          '/workspace/packages/test-package/test.txt',
          'utf8',
        );
        expect(fileContent).toBe('HELLO WORLD');
      });

      it('should handle async formatters', async () => {
        vol.mkdirSync('/workspace/packages/test-package', { recursive: true });

        const formatter = vi.fn(async (content: string) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return content.toUpperCase();
        });
        const plugin: Plugin = async (ctx) => {
          await ctx.writeFile('test.txt', 'hello world');
        };
        const config: WorkspaceMetaConfig = {
          plugins: [plugin],
          formatter,
        };

        const runner = new PluginRunner(workspacePath, config);
        await runner.runPluginsForPackage(mockPackage, {
          isCheckMode: false,
        });

        const fileContent = vol.readFileSync(
          '/workspace/packages/test-package/test.txt',
          'utf8',
        );
        expect(fileContent).toBe('HELLO WORLD');
      });

      it('should skip formatting when formatter is not configured', async () => {
        vol.mkdirSync('/workspace/packages/test-package', { recursive: true });

        const plugin: Plugin = async (ctx) => {
          await ctx.writeFile('test.txt', 'hello world');
        };
        const config: WorkspaceMetaConfig = {
          plugins: [plugin],
        };

        const runner = new PluginRunner(workspacePath, config);
        await runner.runPluginsForPackage(mockPackage, {
          isCheckMode: false,
        });

        const fileContent = vol.readFileSync(
          '/workspace/packages/test-package/test.txt',
          'utf8',
        );
        expect(fileContent).toBe('hello world');
      });

      it('should not write file when formatter returns same content', async () => {
        vol.mkdirSync('/workspace/packages/test-package', { recursive: true });

        const formatter = vi.fn((content: string) => content);
        const plugin: Plugin = async (ctx) => {
          await ctx.writeFile('test.txt', 'hello world');
        };
        const config: WorkspaceMetaConfig = {
          plugins: [plugin],
          formatter,
        };

        const runner = new PluginRunner(workspacePath, config);
        await runner.runPluginsForPackage(mockPackage, {
          isCheckMode: false,
        });

        expect(formatter).toHaveBeenCalled();
        // File should still exist with original content
        const fileContent = vol.readFileSync(
          '/workspace/packages/test-package/test.txt',
          'utf8',
        );
        expect(fileContent).toBe('hello world');
      });

      it('should handle formatter errors gracefully', async () => {
        vol.mkdirSync('/workspace/packages/test-package', { recursive: true });

        const formatter = vi.fn(() => {
          throw new Error('Formatter error');
        });
        const plugin: Plugin = async (ctx) => {
          await ctx.writeFile('test.txt', 'hello world');
        };
        const config: WorkspaceMetaConfig = {
          plugins: [plugin],
          formatter,
        };

        const runner = new PluginRunner(workspacePath, config);
        const result = await runner.runPluginsForPackage(mockPackage, {
          isCheckMode: false,
        });

        // File should still be written with original content
        expect(result.filesChanged).toEqual(['test.txt']);
        const fileContent = vol.readFileSync(
          '/workspace/packages/test-package/test.txt',
          'utf8',
        );
        expect(fileContent).toBe('hello world');
      });
    });

    describe('edge cases', () => {
      it('should handle deeply nested file paths', async () => {
        vol.mkdirSync('/workspace/packages/test-package/src/components/ui', {
          recursive: true,
        });

        const plugin: Plugin = async (ctx) => {
          await ctx.writeFile(
            'src/components/ui/Button.tsx',
            'export const Button = () => {}',
          );
        };
        const config: WorkspaceMetaConfig = {
          plugins: [plugin],
        };

        const runner = new PluginRunner(workspacePath, config);
        const result = await runner.runPluginsForPackage(mockPackage, {
          isCheckMode: false,
        });

        expect(result.filesChanged).toEqual(['src/components/ui/Button.tsx']);
        const fileContent = vol.readFileSync(
          '/workspace/packages/test-package/src/components/ui/Button.tsx',
          'utf8',
        );
        expect(fileContent).toBe('export const Button = () => {}');
      });

      it('should handle empty content', async () => {
        vol.mkdirSync('/workspace/packages/test-package', { recursive: true });

        const plugin: Plugin = async (ctx) => {
          await ctx.writeFile('empty.txt', '');
        };
        const config: WorkspaceMetaConfig = {
          plugins: [plugin],
        };

        const runner = new PluginRunner(workspacePath, config);
        const result = await runner.runPluginsForPackage(mockPackage, {
          isCheckMode: false,
        });

        expect(result.filesChanged).toEqual(['empty.txt']);
        const fileContent = vol.readFileSync(
          '/workspace/packages/test-package/empty.txt',
          'utf8',
        );
        expect(fileContent).toBe('');
      });
    });
  });

  describe('runPluginsForPackages', () => {
    it('should run plugins for multiple packages', async () => {
      const packages: Package[] = [
        {
          name: 'package-a',
          path: '/workspace/packages/package-a',
          packageJson: { name: 'package-a', version: '1.0.0' },
        },
        {
          name: 'package-b',
          path: '/workspace/packages/package-b',
          packageJson: { name: 'package-b', version: '1.0.0' },
        },
      ];

      const plugin = vi.fn();
      const config: WorkspaceMetaConfig = {
        plugins: [plugin],
      };

      const runner = new PluginRunner(workspacePath, config);
      const results = await runner.runPluginsForPackages(packages, {
        isCheckMode: false,
      });

      expect(results).toHaveLength(2);
      expect(results[0].packageName).toBe('package-a');
      expect(results[1].packageName).toBe('package-b');
      expect(plugin).toHaveBeenCalledTimes(2);
    });
  });
});
