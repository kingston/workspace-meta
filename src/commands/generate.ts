import * as prompts from '@inquirer/prompts';
import path from 'node:path';

import { loadConfig } from '#src/services/config-loader.js';
import { PluginRunner } from '#src/services/plugin-runner.js';
import { discoverPackages } from '#src/services/workspace-discovery.js';
import { ErrorWithHelpMessage } from '#src/utils/error.js';
import { ensureDir, writeJson } from '#src/utils/fs.js';
import { Logger } from '#src/utils/logger.js';
import { isValidPackageName } from '#src/utils/workspace-utils.js';

export interface GenerateOptions {
  path?: string;
}

export async function generateCommand(
  workspacePath: string,
  packageName: string,
  options: GenerateOptions = {},
): Promise<{ success: boolean }> {
  // Validate package name
  if (!isValidPackageName(packageName)) {
    throw new ErrorWithHelpMessage(
      `Invalid package name: ${packageName}`,
      'Please use a valid package name',
    );
  }

  // Load configuration
  const config = await loadConfig(workspacePath);

  if (!config) {
    throw new ErrorWithHelpMessage(
      'No workspace-meta configuration found',
      'Run `workspace-meta init` to create a configuration file',
    );
  }

  if (!config.generateNewPackage) {
    throw new ErrorWithHelpMessage(
      'generateNewPackage function not defined in configuration',
      'Please define a generateNewPackage function in your workspace-meta configuration',
    );
  }

  // Determine package path
  let packagePath: string;
  if (options.path) {
    packagePath = path.resolve(workspacePath, options.path);
  } else {
    const customPath = await prompts.input({
      message: 'Enter package path (relative to workspace root):',
      default: `packages/${packageName}`,
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Path cannot be empty';
        }
        return true;
      },
    });
    packagePath = path.resolve(workspacePath, customPath);
  }

  Logger.info(`Creating package at: ${packagePath}`);

  // Generate initial package.json using config function
  const initialPackageJson = await config.generateNewPackage({
    prompts,
    packageName,
    packagePath,
  });

  // Ensure directory exists
  await ensureDir(packagePath);

  // Write initial package.json
  await writeJson(path.join(packagePath, 'package.json'), initialPackageJson, {
    spaces: 2,
  });

  Logger.success('Initial package.json created');

  // Create fake package object for plugin runner
  const fakePackage = {
    name: packageName,
    path: packagePath,
    packageJson: initialPackageJson,
  };

  // Discover existing packages to provide context
  const existingPackages = discoverPackages(workspacePath, undefined, {
    includeRootPackage: config.includeRootPackage,
  });

  // Run plugins on the new package
  const runner = new PluginRunner(workspacePath, config);
  const result = await runner.runPluginsForPackage(
    fakePackage,
    {
      isCheckMode: false,
    },
    [...existingPackages, fakePackage],
  );

  // Report results
  if (result.errors.length > 0) {
    Logger.error(
      `Package generation completed with ${result.errors.length} error(s):`,
    );
    for (const error of result.errors) {
      Logger.error(`  ${error}`);
    }
    return { success: false };
  } else {
    Logger.success(
      `Package '${packageName}' generated successfully with ${result.filesChanged.length} file(s)`,
    );
    for (const file of result.filesChanged) {
      Logger.info(`  ${file}`);
    }
    return { success: true };
  }
}
