#!/usr/bin/env node

// Import and execute the CLI
try {
  await import('../dist/cli.js');
} catch (error) {
  console.error('Failed to start workspace-meta:', error.message);
  process.exit(1);
}
