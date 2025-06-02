import type { Plugin, PluginContext } from '#src/types/config.js';

/**
 * Ensures that a file exists with the given content.
 *
 * @param filePath - The path to the file to ensure.
 * @param content - The content to write to the file. If a function is provided, it will be called with the plugin context.
 * @returns A plugin that ensures the file exists with the given content.
 */
export function ensureFile(
  filePath: string,
  content:
    | string
    | ((ctx: PluginContext) => string | Promise<string> | undefined),
): Plugin {
  return async (ctx: PluginContext): Promise<void> => {
    const finalContent =
      typeof content === 'function' ? await content(ctx) : content;

    if (finalContent) {
      await ctx.writeFile(filePath, finalContent);
    }
  };
}
