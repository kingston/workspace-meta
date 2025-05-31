import { findWorkspacesRoot } from 'find-workspaces';

/**
 * Finds the root of the workspace by looking for the nearest package.json file
 * @param startPath - The path to start searching from
 * @returns The root of the workspace or undefined if no workspace is found
 */
export function findWorkspaceRoot(
  startPath = process.cwd(),
): string | undefined {
  const rootInfo = findWorkspacesRoot(startPath);
  return rootInfo?.location ?? undefined;
}

/**
 * Validates if a package name is valid according to npm package name rules
 * @param name - The package name to validate
 * @returns True if the package name is valid, false otherwise
 */
export function isValidPackageName(name: string): boolean {
  // Basic validation based on npm package name rules
  const packageNameRegex =
    /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  return packageNameRegex.test(name) && name.length <= 214;
}
