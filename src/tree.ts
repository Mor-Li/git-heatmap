export interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  count: number;
  totalCount: number;
  children: TreeNode[];
}

export interface TreeOptions {
  depth?: number;
  exclude?: string[];
  sort?: 'hot' | 'alpha' | 'count';
  noDirs?: boolean;
}

export function buildTree(
  fileCounts: Map<string, number>,
  options: TreeOptions = {},
): TreeNode {
  const root: TreeNode = {
    name: '',
    path: '',
    isDir: true,
    count: 0,
    totalCount: 0,
    children: [],
  };

  for (const [filePath, count] of fileCounts) {
    if (options.exclude?.some((pat) => filePath.includes(pat))) continue;

    const parts = filePath.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('/');

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: currentPath,
          isDir: !isLast,
          count: isLast ? count : 0,
          totalCount: 0,
          children: [],
        };
        current.children.push(child);
      }

      if (isLast) {
        child.count = count;
      }

      current = child;
    }
  }

  // Calculate totals bottom-up
  calcTotals(root);

  // Apply depth limit
  if (options.depth !== undefined) {
    trimDepth(root, 0, options.depth);
  }

  // Sort
  sortTree(root, options.sort || 'hot');

  return root;
}

function calcTotals(node: TreeNode): number {
  if (!node.isDir) {
    node.totalCount = node.count;
    return node.count;
  }
  let total = 0;
  for (const child of node.children) {
    total += calcTotals(child);
  }
  node.totalCount = total;
  return total;
}

function trimDepth(node: TreeNode, currentDepth: number, maxDepth: number) {
  if (currentDepth >= maxDepth) {
    node.children = [];
    return;
  }
  for (const child of node.children) {
    trimDepth(child, currentDepth + 1, maxDepth);
  }
}

function sortTree(node: TreeNode, method: 'hot' | 'alpha' | 'count') {
  node.children.sort((a, b) => {
    // Dirs always first
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;

    switch (method) {
      case 'hot':
      case 'count':
        return b.totalCount - a.totalCount;
      case 'alpha':
        return a.name.localeCompare(b.name);
      default:
        return b.totalCount - a.totalCount;
    }
  });

  for (const child of node.children) {
    sortTree(child, method);
  }
}
