import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../../lib/config";

export function signAccessToken(user: { id: string; email: string }) {
  const options: SignOptions = { expiresIn: config.accessTtl as SignOptions["expiresIn"] };
  return jwt.sign({ email: user.email }, config.accessSecret, {
    subject: user.id,
    ...options
  });
}

export function signRefreshToken(user: { id: string; email: string }) {
  const options: SignOptions = { expiresIn: config.refreshTtl as SignOptions["expiresIn"] };
  return jwt.sign({ email: user.email }, config.refreshSecret, {
    subject: user.id,
    ...options
  });
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, config.refreshSecret) as { sub: string; email: string };
}
