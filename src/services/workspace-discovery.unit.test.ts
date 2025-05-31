import type { PackageJson } from 'pkg-types';

import { findWorkspaces } from 'find-workspaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { discoverPackages } from './workspace-discovery.js';

interface MockWorkspace {
  location: string;
  package: PackageJson & { name: string };
}

vi.mock('find-workspaces', () => ({
  findWorkspaces: vi.fn(),
}));

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
});
