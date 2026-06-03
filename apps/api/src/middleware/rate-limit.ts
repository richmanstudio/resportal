import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http";
import { getRedisClient } from "../lib/redis";

const hits = new Map<string, { count: number; resetAt: number }>();

function hitMemoryLimit(key: string, options: { windowMs: number; max: number }) {
  const now = Date.now();
  const current = hits.get(key);

  if (!current || current.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + options.windowMs });
    return false;
  }

  current.count += 1;
  return current.count > options.max;
}

async function hitRedisLimit(key: string, options: { windowMs: number; max: number }) {
  const redis = await getRedisClient();
  if (!redis) return hitMemoryLimit(key, options);

  const redisKey = `rate-limit:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.pExpire(redisKey, options.windowMs);
  }

  return count > options.max;
}

export function rateLimit(options: { windowMs: number; max: number }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    void hitRedisLimit(key, options)
      .then((limited) => {
        if (limited) {
          next(new HttpError(429, "Слишком много запросов. Попробуйте позже."));
          return;
        }

        next();
      })
      .catch(next);
  };
}
