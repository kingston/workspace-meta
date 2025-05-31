import type { Plugin, PluginContext } from '#src/types/config.js';

/**
 * A plugin that writes a file if a condition is true
 *
 * @param condition - The condition to check
 * @param filePath - The path to the file to write
 * @param content - The content to write to the file
 * @returns A plugin that writes the file if the condition is true
 */
export function conditionalFile(
  condition: (ctx: PluginContext) => boolean | Promise<boolean>,
  filePath: string,
  content: string | ((ctx: PluginContext) => string | Promise<string>),
): Plugin {
  return async (ctx: PluginContext): Promise<void> => {
    const shouldWrite = await condition(ctx);

    if (shouldWrite) {
      const finalContent =
        typeof content === 'function' ? await content(ctx) : content;
      await ctx.writeFile(filePath, finalContent);
    }
  };
}
