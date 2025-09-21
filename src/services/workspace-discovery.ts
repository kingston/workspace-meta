import type { PackageJson } from 'pkg-types';

import { findWorkspaces } from 'find-workspaces';
import micromatch from 'micromatch';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface Package {
  name: string;
  path: string;
  packageJson: PackageJson;
}

export interface DiscoverPackagesOptions {
  includeRootPackage?: boolean;
}

/**
 * Discovers packages in the workspace
 * @param workspacePath - The path to the workspace
 * @param packageGlob - The glob to match packages
 * @param options - Options for package discovery
 * @returns The packages in the workspace
 */
export function discoverPackages(
  workspacePath: string,
  packageGlob?: string,
  options: DiscoverPackagesOptions = {},
): Package[] {
  const packages: Package[] = [];

  // Include root package if option is enabled
  if (options.includeRootPackage) {
    try {
      const rootPackageJsonPath = path.join(workspacePath, 'package.json');
      const rootPackageJson = JSON.parse(
        readFileSync(rootPackageJsonPath, 'utf8'),
      ) as PackageJson;

      const rootPackage: Package = {
        name: rootPackageJson.name ?? path.basename(workspacePath),
        path: workspacePath,
        packageJson: rootPackageJson,
      };

      if (
        !packageGlob ||
        matchesGlob(workspacePath, rootPackage, packageGlob)
      ) {
        packages.push(rootPackage);
      }
    } catch {
      // Root package.json doesn't exist or is invalid
    }
  }

  // Find workspace packages
  const workspaces = findWorkspaces(workspacePath);

  if (workspaces) {
    for (const workspace of workspaces) {
      const pkg: Package = {
        name: workspace.package.name || workspace.location,
        path: workspace.location,
        packageJson: workspace.package as PackageJson,
      };

      if (!packageGlob || matchesGlob(workspacePath, pkg, packageGlob)) {
        packages.push(pkg);
      }
    }
  }

  return packages.toSorted((a, b) => a.path.localeCompare(b.path));
}

function matchesGlob(
  workspacePath: string,
  pkg: Package,
  glob: string,
): boolean {
  // Match against package name
  if (micromatch.isMatch(pkg.name, glob)) {
    return true;
  }

  // Match against relative path
  const relativePath = pkg.path.replace(`${workspacePath}/`, '');
  return micromatch.isMatch(relativePath, glob);
}
