import type { Root, RootContent } from 'mdast';

/** Public assets and root-relative Markdown links respect GitHub Pages' base path. */
export function contentPaths({ base = '/' }: { base?: string } = {}) {
  const prefix = `/${base.split('/').filter(Boolean).join('/')}`;
  return (tree: Root) => {
    function walk(node: Root | RootContent) {
      if ('url' in node && node.url.startsWith('/') && !node.url.startsWith('//') && prefix !== '/') {
        if (node.url !== prefix && !node.url.startsWith(`${prefix}/`)) node.url = prefix + node.url;
      }
      if ('children' in node) node.children.forEach(walk);
    }
    walk(tree);
  };
}
