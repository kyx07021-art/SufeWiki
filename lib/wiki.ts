export interface Section {
  id: string;
  parentId: string | null;
  title: string;
  body: string;
  position: number;
  revision: number;
  updatedAt: string;
}

export interface WikiNode extends Section {
  depth: number;
  children: WikiNode[];
}

export function wikiTree(sections: Section[], parentId: string | null = null, depth = 0): WikiNode[] {
  return sections.filter(section => section.parentId === parentId)
    .sort((a, b) => a.position - b.position)
    .map(section => ({ ...section, depth, children: wikiTree(sections, section.id, depth + 1) }));
}

export function flattenTree(nodes: WikiNode[]): WikiNode[] {
  return nodes.flatMap(node => [node, ...flattenTree(node.children)]);
}

export function normalizeMarkdown(value: string): string {
  let fence = false;
  const lines = value.replace(/\r\n/g, '\n').split('\n');
  return lines.map((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence || !/^#{1,6}\s*$/.test(line)) return line;
    let next = index + 1;
    while (next < lines.length && !lines[next].trim()) next++;
    if (next === lines.length || /^\s*[#>`~|*-]/.test(lines[next])) return line;
    const title = lines[next].trim();
    lines[next] = '';
    return `${line.trim()} ${title}`;
  }).join('\n').trim();
}

export function exportMarkdown(sections: Section[]): string {
  return flattenTree(wikiTree(sections)).map(section =>
    `${'#'.repeat(section.depth + 1)} ${section.title}\n\n${section.body}`
  ).join('\n\n') + '\n';
}
