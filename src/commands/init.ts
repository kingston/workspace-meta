import { confirm, select } from '@inquirer/prompts';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { hasConfig } from '#src/services/config-loader.js';
import { ensureDir } from '#src/utils/fs.js';
import { Logger } from '#src/utils/logger.js';

const CONFIG_TEMPLATE = `import { defineWorkspaceMetaConfig, ensurePackageJson } from 'workspace-meta';

export default defineWorkspaceMetaConfig({
  // Optional: Use prettier to format generated files
  // formatter: prettierFormatter,
  
  plugins: [
    // Example: Ensure all packages have consistent package.json fields
    ensurePackageJson((packageJson) => {
      // Add your organization's standard fields
      packageJson.author = packageJson.author || 'Your Name';
      packageJson.license = packageJson.license || 'MIT';
      
      // Ensure repository field
      if (!packageJson.repository) {
        packageJson.repository = {
          type: 'git',
          url: 'https://github.com/your-org/your-repo.git',
          directory: packageJson.name,
        };
      }
      
      return packageJson;
    }),
    
    // Add more plugins here
  ],
});
`;

export async function initCommand(workspaceRoot: string): Promise<void> {
  Logger.info('Initializing workspace-meta configuration...');

  // Check if config already exists
  if (await hasConfig(workspaceRoot)) {
    const shouldOverwrite = await confirm({
      message:
        'A configuration file already exists. Do you want to overwrite it?',
      default: false,
    });

    if (!shouldOverwrite) {
      Logger.info('Initialization cancelled.');
      return;
    }
  }

  // Ask for config file format
  const format = await select({
    message: 'Select configuration file format:',
    choices: [
      { name: 'JavaScript (.js)', value: 'js' },
      { name: 'JavaScript Module (.mjs)', value: 'mjs' },
      { name: 'TypeScript (.ts)', value: 'ts' },
    ],
    default: 'js',
  });

  const filename = `.workspace-meta/config.${format}`;
  const configPath = path.join(workspaceRoot, filename);

  try {
    await ensureDir(path.join(workspaceRoot, '.workspace-meta'));
    await writeFile(configPath, CONFIG_TEMPLATE, 'utf8');
    Logger.success(`Created configuration file: ${filename}`);

    Logger.info('Next steps:');
    Logger.info('1. Edit the configuration file to match your needs');
    Logger.info(
      '2. Run `workspace-meta sync` to apply changes to all packages',
    );
    Logger.info('3. Run `workspace-meta check` to verify synchronization');
  } catch (error) {
    throw new Error(
      `Failed to create configuration file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
