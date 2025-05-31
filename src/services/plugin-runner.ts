import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { PluginContext, WorkspaceMetaConfig } from '#src/types/config.js';

import { handleFileNotFoundError } from '#src/utils/handle-not-found-error.js';
import { Logger } from '#src/utils/logger.js';

import type { Package } from './workspace-discovery.js';

/**
 * The result of running plugins for a package
 */
export interface PluginResult {
  /**
   * The name of the package
   */
  packageName: string;
  /**
   * The files that were changed
   */
  filesChanged: string[];
  /**
   * The errors that occurred
   */
  errors: string[];
}

export interface PluginRunnerOptions {
  isCheckMode: boolean;
}

/**
 * Runs plugins for a package
 * @param workspacePath - The path to the workspace
 * @param config - The configuration for the workspace
 */
export class PluginRunner {
  constructor(
    private workspacePath: string,
    private config: WorkspaceMetaConfig,
  ) {}

  async runPluginsForPackages(
    packages: Package[],
    options: PluginRunnerOptions,
  ): Promise<PluginResult[]> {
    const results: PluginResult[] = [];

    for (const pkg of packages) {
      const result = await this.runPluginsForPackage(pkg, options);
      results.push(result);
    }

    return results;
  }

  async runPluginsForPackage(
    pkg: Package,
    options: PluginRunnerOptions,
  ): Promise<PluginResult> {
    const result: PluginResult = {
      packageName: pkg.name,
      filesChanged: [],
      errors: [],
    };

    const writtenFiles = new Set<string>();
    const stagedWrites = new Map<string, string>();

    const context: PluginContext = {
      workspacePath: this.workspacePath,
      packagePath: pkg.path,
      packageName: pkg.name,
      packageJson: pkg.packageJson,
      isCheckMode: options.isCheckMode,
      readFile: this.createReadFile(pkg.path),
      writeFile: this.createWriteFile(
        pkg.path,
        writtenFiles,
        stagedWrites,
        result,
        options.isCheckMode,
      ),
    };

    // Execute plugins sequentially
    for (const plugin of this.config.plugins) {
      try {
        await plugin(context);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        result.errors.push(`Plugin error: ${errorMessage}`);
      }
    }

    // If not in check mode and no errors, commit staged writes
    if (!options.isCheckMode && result.errors.length === 0) {
      await this.commitStagedWrites(stagedWrites, result, pkg.path);
    }

    return result;
  }

  private createReadFile(packagePath: string) {
    return async (relativePath: string): Promise<string | undefined> => {
      const filePath = path.join(packagePath, relativePath);

      return await readFile(filePath, 'utf8').catch(handleFileNotFoundError);
    };
  }

  private createWriteFile(
    packagePath: string,
    writtenFiles: Set<string>,
    stagedWrites: Map<string, string>,
    result: PluginResult,
    isCheckMode: boolean,
  ) {
    return async (relativePath: string, content: string): Promise<void> => {
      // Normalize the path
      const normalizedPath = relativePath.replaceAll('\\', '/');

      // Check for "one writer per file" rule
      if (writtenFiles.has(normalizedPath)) {
        throw new Error(
          `File '${normalizedPath}' has already been targeted for writing in this operation`,
        );
      }

      writtenFiles.add(normalizedPath);

      // Format content if formatter is configured
      let finalContent = content;
      if (this.config.formatter) {
        const filePath = path.join(packagePath, relativePath);
        try {
          finalContent = await this.config.formatter(content, filePath);
        } catch (error) {
          Logger.warn(
            `Formatter error for file ${filePath}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      const filePath = path.join(packagePath, relativePath);
      const existingContent = await readFile(filePath, 'utf8').catch(
        handleFileNotFoundError,
      );
      if (existingContent !== finalContent) {
        if (isCheckMode) {
          // In check mode, compare with existing content
          result.filesChanged.push(relativePath);
        } else {
          // In sync mode, stage the write
          stagedWrites.set(relativePath, finalContent);
        }
      }
    };
  }

  private async commitStagedWrites(
    stagedWrites: Map<string, string>,
    result: PluginResult,
    packagePath: string,
  ): Promise<void> {
    for (const [relativePath, content] of stagedWrites) {
      try {
        const filePath = path.join(packagePath, relativePath);
        await writeFile(filePath, content, 'utf8');
        result.filesChanged.push(relativePath);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to write ${relativePath}: ${errorMessage}`);
      }
    }
  }
}
