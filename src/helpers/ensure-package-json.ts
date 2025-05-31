import type { PackageJson } from 'pkg-types';

import type { Plugin, PluginContext } from '#src/types/config.js';

/**
 * A plugin that ensures a package.json file exists and updates it with the provided updater
 *
 * @param updater - The updater function to update the package.json file
 * @returns A plugin that ensures a package.json file exists and updates it with the provided updater
 */
export function ensurePackageJson(
  updater: (packageJson: PackageJson) => PackageJson | undefined,
): Plugin {
  return async (ctx: PluginContext): Promise<void> => {
    const result = updater(ctx.packageJson);
    const finalPackageJson = result ?? ctx.packageJson;

    const content = `${JSON.stringify(finalPackageJson, null, 2)}\n`;
    await ctx.writeFile('package.json', content);
  };
}
