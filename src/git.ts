import { execSync } from 'node:child_process';

export interface GitStats {
  fileCounts: Map<string, number>;
  totalCommits: number;
  totalFiles: number;
  totalChanges: number;
  repoName: string;
  since: string;
}

export function getGitStats(since: string, cwd: string): GitStats {
  // Verify we're in a git repo
  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd, stdio: 'pipe' });
  } catch {
    throw new Error('Not a git repository');
  }

  // Get repo name
  const repoName = execSync('git rev-parse --show-toplevel', {
    cwd,
    encoding: 'utf-8',
  })
    .trim()
    .split('/')
    .pop()!;

  // Get total unique commits in range
  const totalCommits = parseInt(
    execSync(`git rev-list --count --since="${since}" HEAD`, {
      cwd,
      encoding: 'utf-8',
    }).trim(),
  );

  // Get file change counts from git log
  const output = execSync(`git log --since="${since}" --name-only --format=`, {
    cwd,
    encoding: 'utf-8',
    maxBuffer: 100 * 1024 * 1024,
  });

  const fileCounts = new Map<string, number>();
  let totalChanges = 0;

  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    fileCounts.set(trimmed, (fileCounts.get(trimmed) || 0) + 1);
    totalChanges++;
  }

  // Filter to only currently tracked files (respects .gitignore)
  const trackedFiles = new Set(
    execSync('git ls-files', { cwd, encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean),
  );

  for (const file of fileCounts.keys()) {
    if (!trackedFiles.has(file)) {
      fileCounts.delete(file);
    }
  }

  return {
    fileCounts,
    totalCommits,
    totalFiles: fileCounts.size,
    totalChanges,
    repoName,
    since,
  };
}
