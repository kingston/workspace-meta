import type { Plugin, PluginContext } from '#src/types/config.js';

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
