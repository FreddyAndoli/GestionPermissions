import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { db } from '../config/db';
import { leaveRequests, leaveTypes, users, departments, leavePeriods, leaveQuotas, auditLogs } from '../db/schema';
import { eq, and, gte, lte, sql, like } from 'drizzle-orm';

const STORAGE_PATH = process.env.PDF_STORAGE_PATH || './storage/reports';

export const generateLeaveReport = async (params: {
  organizationId: number;
  period: 'month' | 'quarter' | 'year';
  scope: 'organization' | 'department';
  departmentId?: number;
  year: number;
  month?: number;
}) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  let y = height - 50;

  // Header
  page.drawText('Permission Manager', { x: 50, y, size: 24, font: fontBold, color: rgb(0.2, 0.2, 0.6) });
  y -= 30;
  page.drawText(`Rapport de conges - ${params.year}`, { x: 50, y, size: 14, font: fontBold });
  y -= 20;
  page.drawText(`Genere le ${new Date().toLocaleDateString('fr-FR')}`, { x: 50, y, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
  y -= 40;

  // Fetch data
  const conditions = [
    gte(leaveRequests.createdAt, new Date(params.year, 0, 1)),
    lte(leaveRequests.createdAt, new Date(params.year, 11, 31)),
    eq(users.organizationId, params.organizationId)
  ];

  if (params.departmentId) {
    conditions.push(eq(users.departmentId, params.departmentId));
  }

  const rows = await db
    .select()
    .from(leaveRequests)
    .innerJoin(users, eq(users.id, leaveRequests.userId))
    .where(and(...conditions))
    .then((results) => results.map((r) => r.leave_requests));

  // Stats
  const approved = rows.filter(r => r.status === 'approved').length;
  const pending = rows.filter(r => r.status === 'pending').length;
  const rejected = rows.filter(r => r.status === 'rejected').length;
  const totalDays = rows.reduce((sum, r) => sum + (r.totalDays || 0), 0);

  page.drawText('Statistiques', { x: 50, y, size: 14, font: fontBold });
  y -= 20;
  page.drawText(`Demandes approuvees: ${approved}`, { x: 50, y, size: 10, font });
  y -= 14;
  page.drawText(`Demandes en attente: ${pending}`, { x: 50, y, size: 10, font });
  y -= 14;
  page.drawText(`Demandes refusees: ${rejected}`, { x: 50, y, size: 10, font });
  y -= 14;
  page.drawText(`Total jours: ${totalDays}`, { x: 50, y, size: 10, font });
  y -= 30;

  // Table header
  page.drawText('ID', { x: 50, y, size: 10, font: fontBold });
  page.drawText('Statut', { x: 90, y, size: 10, font: fontBold });
  page.drawText('Jours', { x: 160, y, size: 10, font: fontBold });
  page.drawText('Motif', { x: 200, y, size: 10, font: fontBold });
  y -= 20;

  // Table rows
  for (const row of rows.slice(0, 30)) {
    if (y < 60) break;
    page.drawText(String(row.id), { x: 50, y, size: 9, font });
    page.drawText(row.status || '-', { x: 90, y, size: 9, font });
    page.drawText(String(row.totalDays), { x: 160, y, size: 9, font });
    page.drawText((row.reason || '-').substring(0, 40), { x: 200, y, size: 9, font });
    y -= 14;
  }

  // Footer
  page.drawText('Permission Manager - Document confidentiel', {
    x: 50, y: 30, size: 8, font, color: rgb(0.5, 0.5, 0.5)
  });

  const pdfBytes = await pdfDoc.save();

  if (!fs.existsSync(STORAGE_PATH)) {
    fs.mkdirSync(STORAGE_PATH, { recursive: true });
  }

  const fileName = `leave-report-${params.year}-${Date.now()}.pdf`;
  const filePath = path.join(STORAGE_PATH, fileName);
  fs.writeFileSync(filePath, pdfBytes);

  return { fileName, filePath, downloadUrl: `/api/v1/reports/${fileName}` };
};

export const generateAuditPDF = async (params: {
  organizationId: number;
  actorId?: number;
  targetId?: number;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  let y = height - 50;

  page.drawText('Permission Manager', { x: 50, y, size: 24, font: fontBold, color: rgb(0.2, 0.2, 0.6) });
  y -= 30;
  page.drawText('Rapport d\'audit', { x: 50, y, size: 14, font: fontBold });
  y -= 20;
  page.drawText(`Genere le ${new Date().toLocaleDateString('fr-FR')}`, { x: 50, y, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
  y -= 40;

  const conditions = [eq(users.organizationId, params.organizationId)];
  if (params.actorId) conditions.push(eq(auditLogs.actorId, params.actorId));
  if (params.targetId) conditions.push(eq(auditLogs.targetUserId, params.targetId));
  if (params.action) conditions.push(like(auditLogs.action, `%${params.action}%`));
  if (params.entityType) conditions.push(eq(auditLogs.entityType, params.entityType));
  if (params.dateFrom) conditions.push(gte(auditLogs.createdAt, new Date(params.dateFrom)));
  if (params.dateTo) conditions.push(lte(auditLogs.createdAt, new Date(params.dateTo)));

  const where = and(...conditions);
  const rows = await db
    .select()
    .from(auditLogs)
    .innerJoin(users, eq(users.id, auditLogs.actorId))
    .where(where)
    .orderBy(auditLogs.createdAt)
    .then((results) => results.map((r) => r.audit_logs));

  page.drawText('Statistiques', { x: 50, y, size: 14, font: fontBold });
  y -= 20;
  page.drawText(`Total entrees: ${rows.length}`, { x: 50, y, size: 10, font });
  y -= 30;

  page.drawText('ID', { x: 50, y, size: 10, font: fontBold });
  page.drawText('Action', { x: 90, y, size: 10, font: fontBold });
  page.drawText('Entite', { x: 200, y, size: 10, font: fontBold });
  page.drawText('Date', { x: 320, y, size: 10, font: fontBold });
  y -= 20;

  for (const row of rows.slice(0, 40)) {
    if (y < 60) break;
    page.drawText(String(row.id), { x: 50, y, size: 9, font });
    page.drawText(row.action.substring(0, 25), { x: 90, y, size: 9, font });
    page.drawText(`${row.entityType}${row.entityId ? ` #${row.entityId}` : ''}`.substring(0, 30), { x: 200, y, size: 9, font });
    page.drawText(row.createdAt ? new Date(row.createdAt).toLocaleDateString('fr-FR') : '', { x: 320, y, size: 9, font });
    y -= 14;
  }

  page.drawText('Permission Manager - Document confidentiel', { x: 50, y: 30, size: 8, font, color: rgb(0.5, 0.5, 0.5) });

  const pdfBytes = await pdfDoc.save();

  if (!fs.existsSync(STORAGE_PATH)) {
    fs.mkdirSync(STORAGE_PATH, { recursive: true });
  }

  const fileName = `audit-report-${Date.now()}.pdf`;
  const filePath = path.join(STORAGE_PATH, fileName);
  fs.writeFileSync(filePath, pdfBytes);

  return { fileName, filePath, downloadUrl: `/api/v1/reports/${fileName}` };
};

export const getReportPath = (fileName: string) => {
  const sanitized = path.basename(fileName);
  const resolved = path.resolve(STORAGE_PATH, sanitized);
  const storageRoot = path.resolve(STORAGE_PATH);
  if (!resolved.startsWith(storageRoot)) {
    throw new Error('Invalid report file name');
  }
  return resolved;
};
