import { Response } from 'express';

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

function sanitizeCSVCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value).replace(/"/g, '""');
  // Prefix potential formula characters with a single quote to neutralize spreadsheet formula injection
  if (str.length > 0 && FORMULA_PREFIXES.some((p) => str.startsWith(p))) {
    str = `'` + str;
  }
  return `"${str}"`;
}

export function generateCSV(rows: any[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => `"${c.label}"`).join(',');
  const lines = rows.map((row) => {
    return columns
      .map((c) => sanitizeCSVCell(row[c.key]))
      .join(',');
  });
  return [header, ...lines].join('\n');
}

export function downloadCSV(res: Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv);
}
