import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let releaseCommit = process.env.GITHUB_SHA?.trim();

if (!releaseCommit) {
  try {
    releaseCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    releaseCommit = 'unknown';
  }
}

const outputPath = path.join(repoRoot, 'dist', 'release-info.json');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify({ releaseCommit }, null, 2)}\n`, 'utf8');
