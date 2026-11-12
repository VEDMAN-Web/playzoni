// Small frontmatter reader for the content files (src/content/games, src/content/categories).
// It handles only the shapes our files use: quoted or plain scalars, `[]`, lists of scalars,
// one-level objects, and lists of one-level objects. No extra dependency is needed.

export type FrontmatterValue = string | number | boolean | FrontmatterValue[] | { [key: string]: FrontmatterValue };

export interface Parsed {
  data: Record<string, FrontmatterValue>;
  body: string;
}

function scalar(raw: string): FrontmatterValue {
  const text = raw.trim();
  if (text.startsWith('"') && text.endsWith('"')) return JSON.parse(text) as string;
  if (text === '[]') return [];
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return text;
}

const indentOf = (line: string): number => line.length - line.trimStart().length;

function parseBlock(lines: string[]): FrontmatterValue {
  const first = lines.find((l) => l.trim() !== '');
  if (!first) return [];
  if (!first.trim().startsWith('- ')) {
    const object: { [key: string]: FrontmatterValue } = {};
    for (const line of lines) {
      const m = line.trim().match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (m) object[m[1]] = scalar(m[2]);
    }
    return object;
  }
  const list: FrontmatterValue[] = [];
  let current: { [key: string]: FrontmatterValue } | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    if (trimmed.startsWith('- ')) {
      const item = trimmed.slice(2);
      const m = item.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (m) {
        current = { [m[1]]: scalar(m[2]) };
        list.push(current);
      } else {
        current = null;
        list.push(scalar(item));
      }
    } else if (current) {
      const m = trimmed.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (m) current[m[1]] = scalar(m[2]);
    }
  }
  return list;
}

export function parseFrontmatter(source: string): Parsed {
  const text = source.replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n')) return { data: {}, body: text };
  const end = text.indexOf('\n---', 4);
  if (end === -1) return { data: {}, body: text };
  const header = text.slice(4, end).split('\n');
  const body = text.slice(end + 4).replace(/^\n/, '');

  const data: Record<string, FrontmatterValue> = {};
  let i = 0;
  while (i < header.length) {
    const line = header[i];
    const m = indentOf(line) === 0 ? line.match(/^([A-Za-z0-9_]+):\s*(.*)$/) : null;
    if (!m) {
      i++;
      continue;
    }
    if (m[2] !== '') {
      data[m[1]] = scalar(m[2]);
      i++;
      continue;
    }
    const block: string[] = [];
    i++;
    while (i < header.length && (header[i].trim() === '' || indentOf(header[i]) > 0)) {
      block.push(header[i]);
      i++;
    }
    data[m[1]] = parseBlock(block);
  }
  return { data, body };
}
