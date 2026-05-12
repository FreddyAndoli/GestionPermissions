import crypto from 'crypto';
import { getRedisClient } from '../config/redis';

const TOKEN_TTL_SECONDS = 7200; // 2 hours

export const generateTempPassword = (length = 12): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  const bytes = crypto.randomBytes(length);
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += chars[bytes[i] % chars.length];
  }
  return pwd;
};

export const createSetPasswordToken = async (userId: number, email: string): Promise<string> => {
  const token = crypto.randomUUID();
  const redis = await getRedisClient();
  const payload = JSON.stringify({ userId, email, purpose: 'set-password' });
  await redis.setEx(`pwd_token:${token}`, TOKEN_TTL_SECONDS, payload);
  return token;
};

export const validateSetPasswordToken = async (token: string): Promise<{ userId: number; email: string } | null> => {
  const redis = await getRedisClient();
  const raw = await redis.get(`pwd_token:${token}`);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (parsed.purpose !== 'set-password') return null;
  return { userId: parsed.userId, email: parsed.email };
};

export const consumeSetPasswordToken = async (token: string): Promise<boolean> => {
  const redis = await getRedisClient();
  const result = await redis.del(`pwd_token:${token}`);
  return result > 0;
};

// OTP for password recovery
export const createOtp = async (identifier: string): Promise<string> => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  const redis = await getRedisClient();
  await redis.setEx(`pwd_otp:${identifier}`, TOKEN_TTL_SECONDS, otp);
  return otp;
};

export const validateOtp = async (identifier: string, otp: string): Promise<boolean> => {
  const redis = await getRedisClient();
  const stored = await redis.get(`pwd_otp:${identifier}`);
  if (!stored) return false;
  return stored === otp;
};

export const consumeOtp = async (identifier: string): Promise<boolean> => {
  const redis = await getRedisClient();
  const result = await redis.del(`pwd_otp:${identifier}`);
  return result > 0;
};
