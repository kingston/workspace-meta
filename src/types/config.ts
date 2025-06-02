import type * as prompts from '@inquirer/prompts';
import type { PackageJson } from 'pkg-types';

/**
 * Information about a package in the workspace
 */
export interface PackageInfo {
  /**
   * The name of the package
   */
  name: string;
  /**
   * The absolute path to the package
   */
  path: string;
  /**
   * The package.json object for the package
   */
  packageJson: PackageJson;
}

/**
 * Context object passed to plugins
 */
export interface PluginContext {
  /**
   * The absolute path to the workspace root
   */
  workspacePath: string;
  /**
   * The absolute path to the package
   */
  packagePath: string;
  /**
   * The name of the package
   */
  packageName: string;
  /**
   * The package.json object for the package
   */
  packageJson: PackageJson;
  /**
   * The absolute path to the config directory (where workspace-meta.config.js is located)
   */
  configDirectory: string;
  /**
   * Information about all packages in the workspace
   */
  workspacePackages: PackageInfo[];
  /**
   * Reads a file from the package
   */
  isCheckMode: boolean;
  /**
   * The function to read a file from the package
   */
  readFile: (path: string) => Promise<string | undefined>;
  /**
   * The function to write a file to the package
   */
  writeFile: (path: string, content: string) => Promise<void>;
}

export type Plugin = (ctx: PluginContext) => Promise<void> | void;

/**
 * Options for the generateNewPackage function
 */
export interface GenerateNewPackageOptions {
  /**
   * The prompts object
   */
  prompts: typeof prompts;
  /**
   * The name of the package
   */
  packageName: string;
  /**
   * The absolute path to the package
   */
  packagePath: string;
}

/**
 * The configuration for the workspace-meta CLI
 */
export interface WorkspaceMetaConfig {
  /**
   * The plugins to run
   */
  plugins: Plugin[];
  /**
   * Whether to include the root package in workspace discovery
   * @default false
   */
  includeRootPackage?: boolean;
  /**
   * The function to generate a new package
   */
  generateNewPackage?: (
    options: GenerateNewPackageOptions,
  ) => Promise<PackageJson>;
  /**
   * The formatter function to format files
   * @param content - The content to format
   * @param filename - The filename to format
   * @returns The formatted content
   */
  formatter?: (content: string, filename: string) => Promise<string> | string;
}
