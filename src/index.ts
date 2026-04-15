#!/usr/bin/env node

import { Command } from 'commander';
import { getGitStats } from './git.js';
import { buildTree } from './tree.js';
import { renderHeader, renderTree, renderFlat } from './render.js';

const program = new Command();

program
  .name('git-heatmap')
  .description('Visualize git commit frequency as a colored file tree')
  .version('1.0.0')
  .argument('[path]', 'path to git repository', '.')
  .option('-s, --since <duration>', 'time range for analysis', '6 months ago')
  .option('-d, --depth <number>', 'max tree depth (default: 3)', (v) => parseInt(v), 3)
  .option('-n, --top <number>', 'show top N hottest files (flat mode)', parseInt)
  .option('-e, --exclude <pattern...>', 'exclude files matching pattern')
  .option('--sort <method>', 'sort: hot, alpha, count', 'hot')
  .action((path: string, opts) => {
    try {
      const cwd = path === '.' ? process.cwd() : path;
      const stats = getGitStats(opts.since, cwd);

      if (stats.fileCounts.size === 0) {
        console.log(`\n  No commits found in the last ${opts.since}\n`);
        process.exit(0);
      }

      // Print header
      console.log(renderHeader(stats));

      const maxCount = Math.max(...stats.fileCounts.values());

      if (opts.top) {
        // Flat mode: just show top N files
        console.log(renderFlat(stats.fileCounts, maxCount, opts.top));
      } else {
        // Tree mode
        const tree = buildTree(stats.fileCounts, {
          depth: opts.depth,
          exclude: opts.exclude,
          sort: opts.sort,
        });
        console.log(renderTree(tree, tree.totalCount));
      }

      console.log('');
    } catch (err: any) {
      if (err.message === 'Not a git repository') {
        console.error('\n  Error: not a git repository\n');
      } else {
        console.error(`\n  Error: ${err.message}\n`);
      }
      process.exit(1);
    }
  });

program.parse();
