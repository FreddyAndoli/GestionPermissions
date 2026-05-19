import { Request, Response } from 'express';
import { listAuditLogs } from '../services/audit.service';
import { generateCSV, downloadCSV } from '../services/csv.service';

export const exportAuditCSV = async (req: Request, res: Response) => {
  try {
    const { actorId, targetId, action, entityType, dateFrom, dateTo } = req.query;
    const result = await listAuditLogs({
      organizationId: req.user!.organizationId,
      actorId: actorId ? parseInt(actorId as string) : undefined,
      targetId: targetId ? parseInt(targetId as string) : undefined,
      action: action as string,
      entityType: entityType as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      page: 1,
      limit: 10000
    });
    const csv = generateCSV(result.data, [
      { key: 'id', label: 'ID' },
      { key: 'actorId', label: 'Acteur' },
      { key: 'targetUserId', label: 'Cible' },
      { key: 'action', label: 'Action' },
      { key: 'entityType', label: 'Entite' },
      { key: 'entityId', label: 'Entite ID' },
      { key: 'comment', label: 'Commentaire' },
      { key: 'createdAt', label: 'Date' }
    ]);
    downloadCSV(res, `audit-export-${new Date().toISOString().split('T')[0]}.csv`, csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
};

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { actorId, targetId, action, entityType, dateFrom, dateTo, page, limit } = req.query;
    const result = await listAuditLogs({
      organizationId: req.user!.organizationId,
      actorId: actorId ? parseInt(actorId as string) : undefined,
      targetId: targetId ? parseInt(targetId as string) : undefined,
      action: action as string,
      entityType: entityType as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};
