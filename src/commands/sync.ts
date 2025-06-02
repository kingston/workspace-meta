import { loadConfig } from '#src/services/config-loader.js';
import { PluginRunner } from '#src/services/plugin-runner.js';
import { discoverPackages } from '#src/services/workspace-discovery.js';
import { ErrorWithHelpMessage } from '#src/utils/error.js';
import { Logger } from '#src/utils/logger.js';

export async function syncCommand(
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
  const packages = discoverPackages(workspacePath, packageGlob, {
    includeRootPackage: config.includeRootPackage,
  });

  if (packages.length === 0) {
    Logger.warn('No packages found in workspace');
    return { success: true };
  }

  Logger.info(`Found ${packages.length} package(s) to sync`);

  // Run plugins
  const runner = new PluginRunner(workspacePath, config);
  const results = await runner.runPluginsForPackages(packages, {
    isCheckMode: false,
  });

  // Report results
  let totalFilesChanged = 0;
  let totalErrors = 0;

  for (const result of results) {
    if (result.errors.length > 0) {
      Logger.error(`${result.packageName}: ${result.errors.length} error(s)`);
      for (const error of result.errors) {
        Logger.error(`  ${error}`);
      }
      totalErrors += result.errors.length;
    } else if (result.filesChanged.length > 0) {
      Logger.success(
        `${result.packageName}: ${result.filesChanged.length} file(s) updated`,
      );
      for (const file of result.filesChanged) {
        Logger.info(`  ${file}`);
      }
      totalFilesChanged += result.filesChanged.length;
    } else {
      Logger.info(`${result.packageName}: up to date`);
    }
  }

  if (totalErrors > 0) {
    Logger.error(`Sync completed with ${totalErrors} error(s)`);
    return { success: false };
  } else {
    Logger.success(
      `Sync completed successfully. ${totalFilesChanged} file(s) updated.`,
    );
    return { success: true };
  }
}
