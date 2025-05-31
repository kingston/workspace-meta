import { createJiti } from 'jiti';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { WorkspaceMetaConfig } from '#src/types/config.js';

import { fileExists } from '#src/utils/fs.js';
import { Logger } from '#src/utils/logger.js';

const CONFIG_FOLDER = '.workspace-meta';

const EXTENSIONS = ['.js', '.mjs', '.ts', '.cts'];

const CONFIG_FILENAMES = EXTENSIONS.map((ext) =>
  path.join(CONFIG_FOLDER, `config${ext}`),
);

const jiti = createJiti(import.meta.url);

/**
 * Loads the configuration for the workspace
 * @param workspaceRoot - The root of the workspace
 * @returns The configuration for the workspace or undefined if no configuration file is found
 */
export async function loadConfig(
  workspaceRoot: string,
): Promise<WorkspaceMetaConfig | undefined> {
  // Try to find config file
  const configPath = await getConfigFilePath(workspaceRoot);

  if (!configPath) {
    Logger.debug('No configuration file found');
    return undefined;
  }

  Logger.debug(`Loading configuration from ${configPath}`);

  try {
    // Import the config file as an ES module
    const configUrl = pathToFileURL(configPath).href;
    const config = await jiti.import(configUrl, {
      default: true,
    });

    if (!config || typeof config !== 'object') {
      throw new Error('Configuration file must export a default config object');
    }

    // Validate config structure
    if (!('plugins' in config) || !Array.isArray(config.plugins)) {
      throw new Error('Configuration must have a "plugins" array');
    }

    if (config.plugins.some((plugin) => typeof plugin !== 'function')) {
      throw new Error('All plugins must be functions');
    }

    if (
      'generateNewPackage' in config &&
      typeof config.generateNewPackage !== 'function'
    ) {
      throw new Error('generateNewPackage must be a function');
    }

    if ('formatter' in config && typeof config.formatter !== 'function') {
      throw new Error('formatter must be a function');
    }

    return config as WorkspaceMetaConfig;
  } catch (error) {
    throw new Error(
      `Failed to load configuration from ${configPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Finds the path to the configuration file for the workspace
 * @param workspaceRoot - The root of the workspace
 * @returns The path to the configuration file or undefined if no configuration file is found
 */
export async function getConfigFilePath(
  workspaceRoot: string,
): Promise<string | undefined> {
  for (const filename of CONFIG_FILENAMES) {
    const candidatePath = path.join(workspaceRoot, filename);
    if (await fileExists(candidatePath)) {
      return candidatePath;
    }
  }
  return undefined;
}

/**
 * Checks if the workspace has a configuration file
 * @param workspaceRoot - The root of the workspace
 * @returns True if the workspace has a configuration file, false otherwise
 */
export async function hasConfig(workspaceRoot: string): Promise<boolean> {
  return (await getConfigFilePath(workspaceRoot)) !== undefined;
}
