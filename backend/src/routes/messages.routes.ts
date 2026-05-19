import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { db } from '../config/db';
import { conversations, conversationParticipants, messages, users } from '../db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { Request, Response } from 'express';
import { asyncHandler, parseId } from '../utils/asyncHandler';
import { broadcastToConversation } from '../services/websocket.service';
import { z } from 'zod';

const router = Router();

const createConversationSchema = z.object({
  participantIds: z.array(z.number().int().positive()).min(1),
  title: z.string().max(255).optional()
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000)
});

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
      .orderBy(desc(messages.createdAt))
      .limit(1);

    enriched.push({ ...conv, participants, lastMessage });
  }

  res.json(enriched);
}));

router.post('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { participantIds, title } = createConversationSchema.parse(req.body);
  const allIds = [...new Set([...participantIds, req.user!.id])];

  // Verify all participants exist
  const existingUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, allIds));
  if (existingUsers.length !== allIds.length) {
    res.status(400).json({ error: 'One or more participant IDs are invalid' });
    return;
  }

  const [conv] = await db.insert(conversations).values({ title }).$returningId();
  const convId = conv.id;

  await db.insert(conversationParticipants).values(
    allIds.map(uid => ({ conversationId: convId, userId: uid }))
  );

  const [row] = await db.select().from(conversations).where(eq(conversations.id, convId)).limit(1);
  res.status(201).json(row);
}));

router.get('/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);

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
  if (!conv[0]) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
  const participants = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
    .from(conversationParticipants)
    .innerJoin(users, eq(conversationParticipants.userId, users.id))
    .where(eq(conversationParticipants.conversationId, id));

  res.json({ conversation: conv[0], messages: msgs, participants });
}));

router.post('/:id/messages', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const { content } = sendMessageSchema.parse(req.body);

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

  // Broadcast to all online participants
  const participants = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, id));
  const participantIds = participants.map(p => p.userId);

  const [sender] = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, req.user!.id))
    .limit(1);

  broadcastToConversation(participantIds, {
    type: 'chat_message',
    data: {
      conversationId: id,
      message: row,
      sender: sender || { firstName: 'Utilisateur', lastName: '' }
    }
  });

  res.status(201).json(row);
}));

export default router;
