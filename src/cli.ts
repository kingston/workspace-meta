#!/usr/bin/env node

import { Command } from 'commander';
import path from 'node:path';

import { checkCommand } from '#src/commands/check.js';
import { generateCommand } from '#src/commands/generate.js';
import { initCommand } from '#src/commands/init.js';
import { syncCommand } from '#src/commands/sync.js';
import { Logger } from '#src/utils/logger.js';
import { findWorkspaceRoot } from '#src/utils/workspace-utils.js';

import packageJson from '../package.json' with { type: 'json' };
import { ErrorWithHelpMessage } from './utils/error.js';

const program = new Command();

function resolveWorkspaceRoot(cwd?: string): string {
  const startPath = cwd ? path.resolve(cwd) : process.cwd();
  const workspaceRoot = findWorkspaceRoot(startPath);

  if (!workspaceRoot) {
    throw new ErrorWithHelpMessage(
      'Not in a workspace. Please run this command from within a monorepo.',
      'Use --cwd to specify a different directory or navigate to a monorepo workspace.',
    );
  }

  return workspaceRoot;
}

program
  .name('workspace-meta')
  .description(
    'Synchronize and manage metadata files across packages within a monorepo',
  )
  .version(packageJson.version)
  .option(
    '--cwd <dir>',
    'Specify the working directory (can also be set per command)',
  );

program
  .command('sync')
  .description('Synchronize metadata files across packages')
  .argument('[package-glob]', 'Optional glob pattern to filter packages')
  .option('--cwd <dir>', 'Specify the working directory')
  .action(
    async (packageGlob: string | undefined, options: { cwd?: string }) => {
      const workspaceRoot = resolveWorkspaceRoot(options.cwd);
      const result = await syncCommand(workspaceRoot, packageGlob);
      if (!result.success) {
        process.exit(1);
      }
    },
  );

program
  .command('check')
  .description(
    'Check if metadata files are synchronized without making changes',
  )
  .argument('[package-glob]', 'Optional glob pattern to filter packages')
  .option('--cwd <dir>', 'Specify the working directory')
  .action(
    async (packageGlob: string | undefined, options: { cwd?: string }) => {
      const workspaceRoot = resolveWorkspaceRoot(options.cwd);
      const result = await checkCommand(workspaceRoot, packageGlob);
      if (!result.success) {
        process.exit(1);
      }
    },
  );

program
  .command('generate')
  .description('Generate a new package and synchronize it')
  .argument('<package-name>', 'Name of the package to generate')
  .option(
    '--path <path>',
    'Custom path for the new package (relative to workspace root)',
  )
  .option('--cwd <dir>', 'Specify the working directory')
  .action(
    async (packageName: string, options: { path?: string; cwd?: string }) => {
      const workspaceRoot = resolveWorkspaceRoot(options.cwd);
      const result = await generateCommand(workspaceRoot, packageName, options);
      if (!result.success) {
        process.exit(1);
      }
    },
  );

program
  .command('init')
  .description('Initialize workspace-meta configuration')
  .option('--cwd <dir>', 'Specify the working directory')
  .action(async (options: { cwd?: string }) => {
    const workspaceRoot = resolveWorkspaceRoot(options.cwd);
    await initCommand(workspaceRoot);
  });

// Handle unknown commands
program.on('command:*', (operands: string[]) => {
  Logger.error(`Unknown command: ${operands[0]}`);
  Logger.info('Run `workspace-meta --help` for available commands');
  process.exit(1);
});

try {
  await program.parseAsync();
} catch (err) {
  if (err instanceof ErrorWithHelpMessage) {
    Logger.error(err.message);
    Logger.info(err.helpMessage);
    process.exit(1);
  }

  Logger.error(String(err));
  process.exit(1);
}
