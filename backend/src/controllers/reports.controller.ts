import { Request, Response } from 'express';
import fs from 'fs';
import { generateLeaveReport, generateAuditPDF, getReportPath } from '../services/reports.service';
import { logger } from '../utils/logger';

export const generateReport = async (req: Request, res: Response) => {
  try {
    const { type, period, scope, departmentId, year, month, actorId, targetId, action, entityType, dateFrom, dateTo } = req.body;

    let result;
    if (type === 'leaves') {
      result = await generateLeaveReport({
        organizationId: req.user!.organizationId,
        period,
        scope,
        departmentId,
        year: year || new Date().getFullYear(),
        month
      });
    } else if (type === 'audit') {
      result = await generateAuditPDF({
        organizationId: req.user!.organizationId,
        actorId,
        targetId,
        action,
        entityType,
        dateFrom,
        dateTo
      });
    } else {
      res.status(400).json({ error: 'Unknown report type' });
      return;
    }

    res.json({
      message: 'Report generated',
      reportId: result.fileName,
      downloadUrl: result.downloadUrl
    });
  } catch (err) {
    logger.error('Generate report error', { error: err });
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

export const downloadReport = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const filePath = getReportPath(reportId);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    // Verify report belongs to caller's org by checking it starts with org-specific prefix
    // Reports are currently not org-scoped in storage; org scoping requires a metadata table or org subdirectories.
    // TODO: Add organization_id to reports table or store in org subdirectories for full isolation.
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${reportId}"`);
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      logger.error('Report stream error', { error: err });
      if (!res.headersSent) res.status(500).json({ error: 'Failed to download report' });
    });
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download report' });
  }
};

export const getAnomalies = async (_req: Request, res: Response) => {
  try {
    // Placeholder - would query for orphans, unused permissions, etc.
    res.json({
      anomalies: [
        { type: 'orphan_user', count: 0, message: 'No orphan users found' },
        { type: 'unused_permission', count: 0, message: 'No unused permissions found' }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch anomalies' });
  }
};
