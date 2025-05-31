import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const fixtureDir = path.join(process.cwd(), 'fixtures/pnpm-workspace');

describe('check command e2e', () => {
  it('should run check command without modifying files', () => {
    // Read original file contents
    const originalWorkspaceYaml = readFileSync(
      path.join(fixtureDir, 'pnpm-workspace.yaml'),
      'utf8',
    );
    const originalRootPackageJson = readFileSync(
      path.join(fixtureDir, 'package.json'),
      'utf8',
    );
    const originalPackageAJson = readFileSync(
      path.join(fixtureDir, 'packages/package-a/package.json'),
      'utf8',
    );
    const originalPackageBJson = readFileSync(
      path.join(fixtureDir, 'packages/package-b/package.json'),
      'utf8',
    );

    // Run the check command
    const result = execSync('pnpm dev check -c ./fixtures/pnpm-workspace', {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    // Verify command output
    expect(result).toContain('@test/package-a');
    expect(result).toContain('@test/package-b');
    expect(result).toContain('All packages are in sync');

    // Verify files were not modified
    expect(
      readFileSync(path.join(fixtureDir, 'pnpm-workspace.yaml'), 'utf8'),
    ).toBe(originalWorkspaceYaml);
    expect(readFileSync(path.join(fixtureDir, 'package.json'), 'utf8')).toBe(
      originalRootPackageJson,
    );
    expect(
      readFileSync(
        path.join(fixtureDir, 'packages/package-a/package.json'),
        'utf8',
      ),
    ).toBe(originalPackageAJson);
    expect(
      readFileSync(
        path.join(fixtureDir, 'packages/package-b/package.json'),
        'utf8',
      ),
    ).toBe(originalPackageBJson);
  });
});
