const PRETTIER_SUPPORTED_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
  '.json',
  '.jsonc',
  '.css',
  '.scss',
  '.less',
  '.html',
  '.htm',
  '.vue',
  '.yaml',
  '.yml',
  '.md',
  '.mdx',
  '.xml',
  '.svg',
  '.graphql',
  '.gql',
]);

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
    // Check if the file extension is supported by Prettier
    const extension = filename
      .toLowerCase()
      .slice(Math.max(0, filename.lastIndexOf('.')));
    if (!PRETTIER_SUPPORTED_EXTENSIONS.has(extension)) {
      return content;
    }

    // Dynamically import prettier to avoid requiring it as a dependency
    // eslint-disable-next-line import-x/no-extraneous-dependencies -- optional dependency
    const prettier = await import('prettier');

    if (!(prettier as unknown)) {
      throw new Error('Prettier is not available');
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
