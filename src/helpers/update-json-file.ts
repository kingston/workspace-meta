import type { Plugin, PluginContext } from '#src/types/config.js';

/**
 * A plugin that updates a JSON file with the provided updater
 *
 * @param filePath - The path to the JSON file to update
 * @param updater - The updater function to update the JSON file
 * @param defaultContent - The default content to use if the file does not exist
 * @returns A plugin that updates a JSON file with the provided updater
 */
export function updateJsonFile<T = Record<string, unknown>>(
  filePath: string,
  updater: (content: T, ctx: PluginContext) => Promise<T> | T | undefined,
  defaultContent?: T,
): Plugin {
  return async (ctx: PluginContext): Promise<void> => {
    let content: T;

    const existingContent = await ctx.readFile(filePath);

    if (existingContent) {
      try {
        content = JSON.parse(existingContent) as T;
      } catch {
        throw new Error(`Failed to parse JSON file ${filePath}`);
      }
    } else {
      content = defaultContent ?? ({} as T);
    }

    const result = await updater(content, ctx);

    if (result) {
      const jsonString = `${JSON.stringify(result, null, 2)}\n`;
      await ctx.writeFile(filePath, jsonString);
    }
  };
}
