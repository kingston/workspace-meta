/**
 * A pre-made formatter that uses Prettier to format files.
 *
 * @example
 * ```ts
 * import { defineWorkspaceMetaConfig, prettierFormatter } from 'workspace-meta';
 *
 * export default defineWorkspaceMetaConfig({
 *   formatter: prettierFormatter,
 *   plugins: [
 *     // your plugins
 *   ],
 * });
 * ```
 */
export async function prettierFormatter(
  content: string,
  filename: string,
): Promise<string> {
  try {
    // Dynamically import prettier to avoid requiring it as a dependency
    // eslint-disable-next-line import-x/no-extraneous-dependencies -- optional dependency
    const prettier = await import('prettier');

    if (!(prettier as unknown)) {
      throw new Error('Prettier is not available');
    }

    // Check if Prettier can parse this file
    const fileInfo = await prettier.getFileInfo(filename);
    if (!fileInfo.inferredParser) {
      // Prettier doesn't know how to format this file type
      return content;
    }

    // Resolve prettier config for the file
    const options = await prettier.resolveConfig(filename);

    // Format the content
    const formatted = await prettier.format(content, {
      ...options,
      filepath: filename,
    });

    return formatted;
  } catch (error) {
    // If prettier is not available or formatting fails, return the original content
    console.warn(`Failed to format ${filename} with Prettier:`, error);
    return content;
  }
}
