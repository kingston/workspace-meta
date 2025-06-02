import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { Plugin, PluginContext } from '#src/types/config.js';

/**
 * Ensures that a file exists with content loaded from a template file.
 *
 * @param filePath - The path to the file to ensure in the package.
 * @param templatePath - The path to the template file relative to the config directory.
 * @returns A plugin that ensures the file exists with the content from the template.
 */
export function ensureFileFrom(
  filePath: string,
  templatePath: string,
): Plugin {
  return async (ctx: PluginContext): Promise<void> => {
    const absoluteTemplatePath = path.resolve(
      ctx.configDirectory,
      templatePath,
    );

    try {
      const content = await readFile(absoluteTemplatePath, 'utf8');
      await ctx.writeFile(filePath, content);
    } catch (error) {
      throw new Error(
        `Failed to read template file "${templatePath}" from config directory: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  };
}