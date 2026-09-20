import type { Element, ElementContent } from 'hast';
import type { ShikiTransformer } from 'shiki';

function element(tagName: string, properties: Element['properties'], children: ElementContent[] = []): Element {
  return { type: 'element', tagName, properties, children };
}

/** Add static, accessible code chrome while Shiki renders at build time. */
export function codeWindow(): ShikiTransformer {
  return {
    name: 'research-code-window',
    root(root) {
      const pre = root.children.find((node): node is Element => node.type === 'element' && node.tagName === 'pre');
      if (!pre) return;
      const meta = this.options.meta?.__raw ?? '';
      const filename = meta.match(/(?:title|filename)=(?:"([^"]+)"|'([^']+)'|(\S+))/);
      const label = filename?.[1] ?? filename?.[2] ?? filename?.[3] ?? this.options.lang ?? 'text';
      pre.properties.tabIndex = 0;
      pre.properties.role = 'region';
      pre.properties.ariaLabel = `${label} code`;
      const dots = element('span', { className: ['window-dots'], ariaHidden: 'true' },
        ['red', 'yellow', 'green'].map(color => element('span', { className: ['window-dot', color] })));
      const title = element('span', { className: ['code-label'] }, [{ type: 'text', value: label }]);
      const button = element('button', {
        type: 'button', className: ['copy-code'], dataCopyCode: '', hidden: true,
        ariaLabel: `Copy ${label} code`,
      }, [{ type: 'text', value: 'Copy' }]);
      const status = element('span', { className: ['sr-only'], role: 'status', dataCopyStatus: '' });
      const header = element('div', { className: ['code-header'] }, [dots, title, button, status]);
      root.children = [element('div', { className: ['code-window'] }, [header, pre])];
    },
  };
}
