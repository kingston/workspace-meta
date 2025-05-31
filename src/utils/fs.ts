import { statSync } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Checks if a file exists and is a file
 * @param filePath - The path to the file
 * @returns True if the file exists and is a file, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
  return stat(filePath)
    .then((file) => file.isFile())
    .catch(() => false);
}

/**
 * Synchronously checks if a file exists and is a file
 * @param filePath - The path to the file
 * @returns True if the file exists and is a file, false otherwise
 */
export function fileExistsSync(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Ensures that a directory exists, creating it and any parent directories if necessary
 * @param dirPath - The path to the directory
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

/**
 * Writes a JSON object to a file
 * @param filePath - The path to the file
 * @param data - The data to write
 * @param options - Options for formatting
 */
export async function writeJson(
  filePath: string,
  data: unknown,
  options?: { spaces?: number },
): Promise<void> {
  const spaces = options?.spaces ?? 2;
  const jsonContent = `${JSON.stringify(data, null, spaces)}\n`;

  // Ensure the parent directory exists
  const dir = path.dirname(filePath);
  await ensureDir(dir);

  await writeFile(filePath, jsonContent, 'utf8');
}
