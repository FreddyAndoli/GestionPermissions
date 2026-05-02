import { Request, Response } from 'express';
import {
  listLeaveRequests, getLeaveRequest, createLeaveRequest,
  approveLeave, rejectLeave, directorApproveLeave, directorRejectLeave,
  getTeamCalendar, getLeaveBalance, getLeaveComments, getLeaveHistory
} from '../services/leaves.service';
import { createLeaveRequestSchema } from '../schemas/leave.schema';
import { logger } from '../utils/logger';
import { generateCSV, downloadCSV } from '../services/csv.service';

export const exportLeavesCSV = async (req: Request, res: Response) => {
  try {
    const { status, userId, type, dateFrom, dateTo } = req.query;
    const rows = await listLeaveRequests({
      userId: userId ? parseInt(userId as string) : undefined,
      status: status as string,
      type: type ? parseInt(type as string) : undefined,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string
    });
    const csv = generateCSV(rows.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      leaveType: r.leaveType?.name || '',
      status: r.status,
      totalDays: r.totalDays,
      reason: r.reason || '',
      createdAt: r.createdAt
    })), [
      { key: 'id', label: 'ID' },
      { key: 'userId', label: 'Utilisateur' },
      { key: 'leaveType', label: 'Type' },
      { key: 'status', label: 'Statut' },
      { key: 'totalDays', label: 'Jours' },
      { key: 'reason', label: 'Motif' },
      { key: 'createdAt', label: 'Date' }
    ]);
    downloadCSV(res, `leaves-export-${new Date().toISOString().split('T')[0]}.csv`, csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export leaves' });
  }
};

export const myLeaves = async (req: Request, res: Response) => {
  try {
    const rows = await listLeaveRequests({ userId: req.user!.id });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch my leaves' });
  }
};

export const getLeaves = async (req: Request, res: Response) => {
  try {
    const { status, userId, type, dateFrom, dateTo } = req.query;
    const rows = await listLeaveRequests({
      userId: userId ? parseInt(userId as string) : undefined,
      status: status as string,
      type: type ? parseInt(type as string) : undefined,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaves' });
  }
};

export const getLeave = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const row = await getLeaveRequest(id);
    if (!row) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leave' });
  }
};

export const createLeave = async (req: Request, res: Response) => {
  try {
    const data = createLeaveRequestSchema.parse(req.body);
    const row = await createLeaveRequest({
      ...data,
      userId: req.user!.id,
      submittedByUserId: req.user!.id
    });
    res.status(201).json(row);
  } catch (err: any) {
    if (err.name === 'ZodError') { res.status(400).json({ error: 'Validation failed', details: err.errors }); return; }
    logger.error('Create leave error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to create leave' });
  }
};

export const approve = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { comment } = req.body;
    const row = await approveLeave(id, req.user!.id, comment);
    res.json(row);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to approve' });
  }
};

export const reject = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { comment } = req.body;
    const row = await rejectLeave(id, req.user!.id, comment);
    res.json(row);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to reject' });
  }
};

export const directorApprove = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { comment } = req.body;
    const row = await directorApproveLeave(id, req.user!.id, comment);
    res.json(row);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to director approve' });
  }
};

export const directorReject = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { comment } = req.body;
    const row = await directorRejectLeave(id, req.user!.id, comment);
    res.json(row);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to director reject' });
  }
};

export const leaveCommentsList = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await getLeaveComments(id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

export const leaveHistory = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await getLeaveHistory(id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

export const teamCalendar = async (req: Request, res: Response) => {
  try {
    const { month, year, departmentId, userId } = req.query;
    const rows = await getTeamCalendar({
      departmentId: departmentId ? parseInt(departmentId as string) : undefined,
      userId: userId ? parseInt(userId as string) : undefined,
      currentUserId: req.user!.id,
      month: month ? parseInt(month as string) : undefined,
      year: year ? parseInt(year as string) : undefined
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch calendar' });
  }
};

export const balance = async (req: Request, res: Response) => {
  try {
    const targetUserId = req.query.userId ? parseInt(req.query.userId as string) : req.user!.id;
    const rows = await getLeaveBalance(targetUserId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
};
