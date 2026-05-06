import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { db } from '../config/db';
import { conversations, conversationParticipants, messages, users } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const participantRows = await db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, req.user!.id));

  const convIds = participantRows.map(p => p.conversationId);
  if (convIds.length === 0) { res.json([]); return; }

  const rows = await db.select().from(conversations).where(inArray(conversations.id, convIds));

  const enriched = [];
  for (const conv of rows) {
    const participants = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
      .from(conversationParticipants)
      .innerJoin(users, eq(conversationParticipants.userId, users.id))
      .where(eq(conversationParticipants.conversationId, conv.id));

    const [lastMessage] = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conv.id))
      .orderBy(messages.createdAt)
      .limit(1);

    enriched.push({ ...conv, participants, lastMessage });
  }

  res.json(enriched);
}));

router.post('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { participantIds, title } = req.body;
  const allIds = [...new Set([...participantIds, req.user!.id])];

  const [conv] = await db.insert(conversations).values({ title }).$returningId();
  const convId = conv.id;

  await db.insert(conversationParticipants).values(
    allIds.map(uid => ({ conversationId: convId, userId: uid }))
  );

  const [row] = await db.select().from(conversations).where(eq(conversations.id, convId)).limit(1);
  res.status(201).json(row);
}));

router.get('/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const [participant] = await db
    .select()
    .from(conversationParticipants)
    .where(and(
      eq(conversationParticipants.conversationId, id),
      eq(conversationParticipants.userId, req.user!.id)
    ))
    .limit(1);

  if (!participant) {
    res.status(403).json({ error: 'You are not a participant of this conversation' });
    return;
  }

  const conv = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
  const participants = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
    .from(conversationParticipants)
    .innerJoin(users, eq(conversationParticipants.userId, users.id))
    .where(eq(conversationParticipants.conversationId, id));

  res.json({ conversation: conv[0], messages: msgs, participants });
}));

router.post('/:id/messages', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { content } = req.body;

  const [participant] = await db
    .select()
    .from(conversationParticipants)
    .where(and(
      eq(conversationParticipants.conversationId, id),
      eq(conversationParticipants.userId, req.user!.id)
    ))
    .limit(1);

  if (!participant) {
    res.status(403).json({ error: 'You are not a participant of this conversation' });
    return;
  }

  const [result] = await db.insert(messages).values({
    conversationId: id,
    senderId: req.user!.id,
    content
  });
  const [row] = await db.select().from(messages).where(eq(messages.id, result.insertId)).limit(1);
  res.status(201).json(row);
}));

export default router;
