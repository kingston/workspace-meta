import { loadConfig } from '#src/services/config-loader.js';
import { PluginRunner } from '#src/services/plugin-runner.js';
import { discoverPackages } from '#src/services/workspace-discovery.js';
import { ErrorWithHelpMessage } from '#src/utils/error.js';
import { Logger } from '#src/utils/logger.js';

export async function checkCommand(
  workspacePath: string,
  packageGlob?: string,
): Promise<{ success: boolean }> {
  // Load configuration
  const config = await loadConfig(workspacePath);

  if (!config) {
    throw new ErrorWithHelpMessage(
      'No workspace-meta configuration found',
      'Run `workspace-meta init` to create a configuration file',
    );
  }

  // Discover packages
  const packages = discoverPackages(workspacePath, packageGlob);

  if (packages.length === 0) {
    Logger.warn('No packages found in workspace');
    return { success: true };
  }

  Logger.info(`Checking ${packages.length} package(s) for differences`);

  // Run plugins in check mode
  const runner = new PluginRunner(workspacePath, config);
  const results = await runner.runPluginsForPackages(packages, {
    isCheckMode: true,
  });

  // Report results
  let totalFilesOutOfSync = 0;
  let totalErrors = 0;
  const outOfSyncPackages: string[] = [];

  for (const result of results) {
    if (result.errors.length > 0) {
      Logger.error(`${result.packageName}: ${result.errors.length} error(s)`);
      for (const error of result.errors) {
        Logger.error(`  ${error}`);
      }
      totalErrors += result.errors.length;
    } else if (result.filesChanged.length > 0) {
      Logger.warn(
        `${result.packageName}: ${result.filesChanged.length} file(s) out of sync`,
      );
      for (const file of result.filesChanged) {
        Logger.warn(`  ${file}`);
      }
      totalFilesOutOfSync += result.filesChanged.length;
      outOfSyncPackages.push(result.packageName);
    } else {
      Logger.success(`${result.packageName}: in sync`);
    }
  }

  if (totalErrors > 0) {
    Logger.error(`Check completed with ${totalErrors} error(s)`);
    return { success: false };
  } else if (totalFilesOutOfSync > 0) {
    Logger.warn(
      `${totalFilesOutOfSync} file(s) in ${outOfSyncPackages.length} package(s) are out of sync`,
    );
    Logger.info('Run `workspace-meta sync` to update them');
    return { success: false };
  } else {
    Logger.success('All packages are in sync');
    return { success: true };
  }
}
