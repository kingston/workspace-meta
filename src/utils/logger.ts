import chalk from 'chalk';

export const Logger = {
  info(message: string): void {
    console.info(message);
  },

  success(message: string): void {
    console.info(chalk.green('✓'), message);
  },

  warn(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  },

  error(message: string): void {
    console.error(chalk.red('✗'), message);
  },

  debug(message: string): void {
    if (process.env.DEBUG) {
      console.debug(chalk.gray('🐛'), message);
    }
  },
};
