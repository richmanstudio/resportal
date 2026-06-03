import { createClient, type RedisClientType } from "redis";
import { config } from "./config";
import { logger } from "./logger";

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;

export async function getRedisClient() {
  if (!config.redisUrl) return null;
  if (client?.isOpen) return client;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const nextClient = createClient({ url: config.redisUrl });
    nextClient.on("error", (error) => {
      logger.warn("Redis client error", { message: error.message });
    });

    try {
      await nextClient.connect();
      client = nextClient as RedisClientType;
      logger.info("Redis connected");
      return client;
    } catch (error) {
      logger.warn("Redis unavailable, using in-memory fallback", {
        message: error instanceof Error ? error.message : String(error)
      });
      await nextClient.disconnect().catch(() => undefined);
      connectPromise = null;
      return null;
    }
  })();

  return connectPromise;
}
