import type { PackageJson } from 'pkg-types';

import { findWorkspaces } from 'find-workspaces';
import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { discoverPackages } from './workspace-discovery.js';

interface MockWorkspace {
  location: string;
  package: PackageJson & { name: string };
}

vi.mock('find-workspaces', () => ({
  findWorkspaces: vi.fn(),
}));

vi.mock('node:fs');
vi.mock('node:fs/promises');

describe('discoverPackages', () => {
  const mockWorkspacePath = '/workspace';
  const mockWorkspaces: MockWorkspace[] = [
    {
      location: '/workspace/packages/pkg-a',
      package: { name: '@workspace/pkg-a' },
    },
    {
      location: '/workspace/packages/pkg-b',
      package: { name: '@workspace/pkg-b' },
    },
    {
      location: '/workspace/apps/app-a',
      package: { name: '@workspace/app-a' },
    },
  ];

  beforeEach(() => {
    vol.reset();
    vi.mocked(findWorkspaces).mockReturnValue(mockWorkspaces);
  });

  it('should return all packages when no glob is provided', () => {
    const packages = discoverPackages(mockWorkspacePath);
    expect(packages).toHaveLength(3);
    expect(packages.map((p) => p.name)).toEqual([
      '@workspace/app-a',
      '@workspace/pkg-a',
      '@workspace/pkg-b',
    ]);
  });

  it('should filter packages by name glob', () => {
    const packages = discoverPackages(mockWorkspacePath, '@workspace/pkg-*');
    expect(packages).toHaveLength(2);
    expect(packages.map((p) => p.name)).toEqual([
      '@workspace/pkg-a',
      '@workspace/pkg-b',
    ]);
  });

  it('should filter packages by path glob', () => {
    const packages = discoverPackages(mockWorkspacePath, 'apps/*');
    expect(packages).toHaveLength(1);
    expect(packages[0].name).toBe('@workspace/app-a');
  });

  it('should return empty array when no workspaces found', () => {
    vi.mocked(findWorkspaces).mockReturnValue(null);
    const packages = discoverPackages(mockWorkspacePath);
    expect(packages).toEqual([]);
  });

  it('should sort packages by path', () => {
    const packages = discoverPackages(mockWorkspacePath);
    expect(packages.map((p) => p.path)).toEqual([
      '/workspace/apps/app-a',
      '/workspace/packages/pkg-a',
      '/workspace/packages/pkg-b',
    ]);
  });

  describe('includeRootPackage option', () => {
    const rootPackageJson = {
      name: 'my-workspace',
      version: '1.0.0',
      workspaces: ['packages/*', 'apps/*'],
    };

    beforeEach(() => {
      vol.fromJSON({
        '/workspace/package.json': JSON.stringify(rootPackageJson),
      });
    });

    it('should not include root package by default', () => {
      const packages = discoverPackages(mockWorkspacePath);
      expect(packages).toHaveLength(3);
      expect(packages.map((p) => p.path)).not.toContain(mockWorkspacePath);
    });

    it('should include root package when option is true', () => {
      const packages = discoverPackages(mockWorkspacePath, undefined, {
        includeRootPackage: true,
      });
      expect(packages).toHaveLength(4);
      expect(packages[0].path).toBe(mockWorkspacePath);
      expect(packages[0].name).toBe('my-workspace');
      expect(packages[0].packageJson).toEqual(rootPackageJson);
    });

    it('should include root package with glob filtering', () => {
      const packages = discoverPackages(mockWorkspacePath, 'my-*', {
        includeRootPackage: true,
      });
      expect(packages).toHaveLength(1);
      expect(packages[0].name).toBe('my-workspace');
    });

    it('should use directory name if root package has no name', () => {
      vol.fromJSON({
        '/workspace/package.json': JSON.stringify({ version: '1.0.0' }),
      });

      const packages = discoverPackages(mockWorkspacePath, undefined, {
        includeRootPackage: true,
      });
      expect(packages).toHaveLength(4);
      expect(packages[0].name).toBe('workspace');
    });

    it('should handle missing root package.json gracefully', () => {
      vol.reset();

      const packages = discoverPackages(mockWorkspacePath, undefined, {
        includeRootPackage: true,
      });
      expect(packages).toHaveLength(3);
      expect(packages.map((p) => p.path)).not.toContain(mockWorkspacePath);
    });
  });
});
