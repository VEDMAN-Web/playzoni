// Minimal CSV reader (RFC 4180): quoted fields, doubled quotes, commas and line breaks inside quotes,
// CRLF or LF line ends. Enough for the launch list; no dependency.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (quoted) throw new Error('CSV: a quoted field is not closed');
  row.push(field);
  if (row.some((cell) => cell !== '')) rows.push(row);
  return rows;
}

// The values of one named column, in file order, without blanks.
export function columnValues(text: string, column: string): string[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) throw new Error('CSV: the file is empty');
  const index = header.map((h) => h.trim()).indexOf(column);
  if (index < 0) throw new Error(`CSV: no "${column}" column (columns: ${header.join(', ')})`);
  return rows.map((r) => (r[index] ?? '').trim()).filter((v) => v !== '');
}
