import { Response } from 'express';

export function generateCSV(rows: any[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => `"${c.label}"`).join(',');
  const lines = rows.map((row) => {
    return columns
      .map((c) => {
        const value = row[c.key];
        if (value === null || value === undefined) return '';
        const str = String(value).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',');
  });
  return [header, ...lines].join('\n');
}

export function downloadCSV(res: Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv);
}
