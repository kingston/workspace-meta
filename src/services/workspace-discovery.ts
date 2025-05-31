import type { PackageJson } from 'pkg-types';

import { findWorkspaces } from 'find-workspaces';
import micromatch from 'micromatch';

export interface Package {
  name: string;
  path: string;
  packageJson: PackageJson;
}

/**
 * Discovers packages in the workspace
 * @param workspacePath - The path to the workspace
 * @param packageGlob - The glob to match packages
 * @returns The packages in the workspace
 */
export function discoverPackages(
  workspacePath: string,
  packageGlob?: string,
): Package[] {
  const workspaces = findWorkspaces(workspacePath);

  if (!workspaces) {
    return [];
  }

  const packages: Package[] = [];

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

  return packages.sort((a, b) => a.path.localeCompare(b.path));
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
