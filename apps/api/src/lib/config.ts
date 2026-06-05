import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "..", "..", ".env") });
dotenv.config();

const weakSecretValues = new Set([
  "change-me-access-secret",
  "change-me-refresh-secret",
  "dev-access-secret",
  "dev-refresh-secret"
]);

const emptyStringToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalUrl = z.preprocess(emptyStringToUndefined, z.string().url().optional());
const optionalString = z.preprocess(emptyStringToUndefined, z.string().min(1).optional());

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    REDIS_URL: optionalUrl,
    API_PORT: z.coerce.number().int().positive().default(4000),
    WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
    JWT_ACCESS_SECRET: z.string().min(16).default("dev-access-secret"),
    JWT_REFRESH_SECRET: z.string().min(16).default("dev-refresh-secret"),
    ACCESS_TOKEN_TTL: z.string().min(1).default("15m"),
    REFRESH_TOKEN_TTL: z.string().min(1).default("30d"),
    AUTH_COOKIE_SECURE: z.coerce.boolean().optional(),
    S3_ENDPOINT: optionalUrl,
    S3_ACCESS_KEY: optionalString,
    S3_SECRET_KEY: optionalString,
    S3_BUCKET: optionalString,
    YOOKASSA_SHOP_ID: optionalString,
    YOOKASSA_SECRET_KEY: optionalString,
    BILLING_RETURN_URL: z.string().url().default("http://localhost:5173/settings?billing=return"),
    APP_PUBLIC_URL: z.string().url().default("http://localhost:5173"),
    EMAIL_MODE: z.enum(["console", "webhook"]).default("console"),
    EMAIL_FROM: z.string().email().default("support@resportal.ru"),
    EMAIL_WEBHOOK_URL: optionalUrl,
    DOCUMENT_MAX_UPLOAD_MB: z.coerce.number().positive().default(25)
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;

    if (weakSecretValues.has(env.JWT_ACCESS_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_ACCESS_SECRET"],
        message: "JWT_ACCESS_SECRET must be changed in production"
      });
    }

    if (weakSecretValues.has(env.JWT_REFRESH_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_REFRESH_SECRET"],
        message: "JWT_REFRESH_SECRET must be changed in production"
      });
    }

    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_REFRESH_SECRET"],
        message: "JWT access and refresh secrets must be different in production"
      });
    }
  });

const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  port: env.API_PORT,
  webOrigin: env.WEB_ORIGIN,
  accessSecret: env.JWT_ACCESS_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET,
  accessTtl: env.ACCESS_TOKEN_TTL,
  refreshTtl: env.REFRESH_TOKEN_TTL,
  authCookieSecure: env.AUTH_COOKIE_SECURE ?? env.NODE_ENV === "production",
  s3Endpoint: env.S3_ENDPOINT,
  s3AccessKey: env.S3_ACCESS_KEY,
  s3SecretKey: env.S3_SECRET_KEY,
  s3Bucket: env.S3_BUCKET,
  yookassaShopId: env.YOOKASSA_SHOP_ID,
  yookassaSecretKey: env.YOOKASSA_SECRET_KEY,
  billingReturnUrl: env.BILLING_RETURN_URL,
  appPublicUrl: env.APP_PUBLIC_URL,
  emailMode: env.EMAIL_MODE,
  emailFrom: env.EMAIL_FROM,
  emailWebhookUrl: env.EMAIL_WEBHOOK_URL,
  documentMaxUploadMb: env.DOCUMENT_MAX_UPLOAD_MB
};
