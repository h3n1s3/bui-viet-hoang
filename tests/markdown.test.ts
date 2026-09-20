import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { codeWindow } from '../src/plugins/code-window.ts';
import { contentPaths } from '../src/plugins/content-paths.ts';
import { parseFragment, type DefaultTreeAdapterTypes } from 'parse5';

const processor = await createMarkdownProcessor({
  shikiConfig: { theme: 'github-dark', transformers: [codeWindow()] },
  remarkPlugins: [[contentPaths, { base: '/bui-viet-hoang/' }]],
});

test('code fences keep highlighted code, filename chrome and an accessible copy control', async () => {
  const result = await processor.render('```python title="example.py"\ndef hello():\n    return "<safe>"\n```');
  assert.match(result.code, /class="code-window"/);
  assert.match(result.code, /class="code-label">example.py/);
  assert.equal((result.code.match(/class="window-dot /g) ?? []).length, 3);
  assert.match(result.code, /data-copy-code/);
  assert.match(result.code, /aria-label="Copy example.py code"/);
  assert.match(result.code, /tabindex="0"/);
  assert.match(result.code, /<span style="color:/);
  assert.doesNotMatch(result.code, /<safe>/);
});

test('plain fences get a text label and filenames cannot inject markup', async () => {
  const plain = await processor.render('```\nplain & simple\n```');
  assert.match(plain.code, /class="code-window"/);
  assert.match(plain.code, /class="code-label">(?:text|plaintext)/);
  const hostile = await processor.render('```text title="<img src=x onerror=alert(1)>"\nexample\n```');
  function checkNode(node: DefaultTreeAdapterTypes.Node) {
    if ('tagName' in node) {
      assert.notEqual(node.tagName, 'img');
      assert.ok(node.attrs.every(attribute => !attribute.name.startsWith('on')));
    }
    if ('childNodes' in node) node.childNodes.forEach(checkNode);
  }
  checkNode(parseFragment(hostile.code));
  assert.match(hostile.code, /&#x3C;img|&lt;img/);
});

test('headings expose unique Unicode anchors for automatically generated TOCs', async () => {
  const result = await processor.render('# Title\n\n## Kiểm thử\n\n### Detail\n\n## Kiểm thử\n\n#### Excluded');
  const toc = result.metadata.headings.filter(h => h.depth === 2 || h.depth === 3);
  assert.equal(toc.length, 3);
  assert.equal(new Set(toc.map(h => h.slug)).size, 3);
  for (const heading of toc) assert.ok(result.code.includes(`id="${heading.slug}"`));
});

test('Markdown supports rich content and fixes base paths without rewriting external URLs', async () => {
  const result = await processor.render('**bold** *italic* `code`\n\n> quote\n\n- item\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n[Research](/research/)\n\n[Already based](/bui-viet-hoang/about/)\n\n[External](https://example.com)\n\n![Matrix](/access-matrix.svg)');
  for (const tag of ['strong', 'em', 'code', 'blockquote', 'ul', 'table']) assert.ok(result.code.includes(`<${tag}`));
  assert.match(result.code, /href="\/bui-viet-hoang\/research\/"/);
  assert.match(result.code, /href="\/bui-viet-hoang\/about\/"/);
  assert.match(result.code, /href="https:\/\/example.com"/);
  assert.match(result.code, /src="\/bui-viet-hoang\/access-matrix.svg"/);
});

test('root deployments preserve root-relative URLs', async () => {
  const rootProcessor = await createMarkdownProcessor({ remarkPlugins: [[contentPaths, { base: '/' }]] });
  const result = await rootProcessor.render('[Research](/research/)');
  assert.match(result.code, /href="\/research\/"/);
});
