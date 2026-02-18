#!/usr/bin/env ts-node
import { promises as fs } from 'fs';
import path from 'path';

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const SKIP_FILES = new Set(['.gitkeep']);

export interface CleanOptions {
  dryRun?: boolean;
  targetDir?: string;
}

async function cleanDirectory(dirPath: string, rootDir: string, options: CleanOptions): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await cleanDirectory(entryPath, rootDir, options);
      continue;
    }

    if (SKIP_FILES.has(entry.name)) {
      continue;
    }

    if (options.dryRun) {
      console.log(`[dry-run] Would remove file: ${path.relative(rootDir, entryPath)}`);
    } else {
      await fs.unlink(entryPath);
      console.log(`Removed file: ${path.relative(rootDir, entryPath)}`);
    }
  }
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export async function cleanPublicDirectory(options: CleanOptions = {}): Promise<void> {
  const { dryRun = false, targetDir = PUBLIC_DIR } = options;

  if (!(await directoryExists(targetDir))) {
    throw new Error(`Public directory not found at ${targetDir}`);
  }

  console.log(`Cleaning files in ${targetDir}${dryRun ? ' (dry-run mode)' : ''}`);
  await cleanDirectory(targetDir, targetDir, { dryRun });
  console.log('Cleanup complete.');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  try {
    await cleanPublicDirectory({ dryRun });
  } catch (error) {
    console.error('Failed to clean public directory:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
