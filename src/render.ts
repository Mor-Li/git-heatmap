import chalk from 'chalk';
import type { TreeNode } from './tree.js';
import type { GitStats } from './git.js';

// Color stops: dim grey → warm grey → salmon → bright red
const COLOR_STOPS: [number, [number, number, number]][] = [
  [0.0, [85, 85, 85]],
  [0.25, [140, 100, 90]],
  [0.5, [200, 80, 60]],
  [0.75, [240, 55, 40]],
  [1.0, [255, 40, 35]],
];

// Log scale to spread out the color distribution
function logRatio(count: number, maxCount: number): number {
  if (maxCount <= 1) return count > 0 ? 1 : 0;
  if (count <= 0) return 0;
  return Math.log(count) / Math.log(maxCount);
}

function interpolateColor(ratio: number): string {
  const clamped = Math.max(0, Math.min(1, ratio));

  let lower = COLOR_STOPS[0];
  let upper = COLOR_STOPS[COLOR_STOPS.length - 1];

  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (clamped >= COLOR_STOPS[i][0] && clamped <= COLOR_STOPS[i + 1][0]) {
      lower = COLOR_STOPS[i];
      upper = COLOR_STOPS[i + 1];
      break;
    }
  }

  const range = upper[0] - lower[0];
  const t = range > 0 ? (clamped - lower[0]) / range : 0;

  const r = Math.round(lower[1][0] + (upper[1][0] - lower[1][0]) * t);
  const g = Math.round(lower[1][1] + (upper[1][1] - lower[1][1]) * t);
  const b = Math.round(lower[1][2] + (upper[1][2] - lower[1][2]) * t);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

export function renderHeader(stats: GitStats): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(
    `  ${chalk.bold.white(stats.repoName)}  ${chalk.dim(`${stats.since} · ${stats.totalCommits} commits · ${stats.totalFiles} files`)}`,
  );
  lines.push('');
  return lines.join('\n');
}

export function renderTree(root: TreeNode, maxCount: number): string {
  const lines: string[] = [];
  const termWidth = process.stdout.columns || 80;

  function render(
    node: TreeNode,
    prefix: string,
    isLast: boolean,
    isRoot: boolean,
  ) {
    if (!isRoot) {
      const ratio = logRatio(node.totalCount, maxCount);
      const color = interpolateColor(ratio);

      const connector = isLast ? '└── ' : '├── ';
      const displayName = node.isDir ? `${node.name}/` : node.name;
      const countStr = formatCount(node.totalCount);

      // Calculate padding for right-aligned count
      const treePrefix = prefix + connector;
      const nameLen = treePrefix.length + displayName.length;
      const gap = Math.max(2, termWidth - nameLen - countStr.length - 2);
      const dots = ' '.repeat(gap);

      lines.push(
        `${chalk.dim(treePrefix)}${chalk.hex(color)(displayName)}${dots}${chalk.hex(color)(countStr)}`,
      );
    }

    const childPrefix = isRoot
      ? ''
      : prefix + (isLast ? '    ' : '│   ');

    for (let i = 0; i < node.children.length; i++) {
      render(node.children[i], childPrefix, i === node.children.length - 1, false);
    }
  }

  render(root, '', true, true);
  return lines.join('\n');
}

export function renderFlat(
  fileCounts: Map<string, number>,
  maxCount: number,
  top: number,
): string {
  const sorted = [...fileCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top);

  const lines: string[] = [];
  const termWidth = process.stdout.columns || 80;
  const maxFileLen = Math.max(...sorted.map(([f]) => f.length));

  for (const [file, count] of sorted) {
    const ratio = logRatio(count, maxCount);
    const color = interpolateColor(ratio);
    const countStr = formatCount(count);
    const gap = Math.max(2, termWidth - file.length - countStr.length - 4);
    const dots = ' '.repeat(gap);

    lines.push(`  ${chalk.hex(color)(file)}${dots}${chalk.hex(color)(countStr)}`);
  }

  return lines.join('\n');
}
