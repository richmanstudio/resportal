import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const storageRoot = path.resolve(process.cwd(), "storage");

export async function saveBase64File(organizationId: string, originalFileName: string, contentBase64: string) {
  const safeName = originalFileName.replace(/[^\w.\-а-яА-ЯёЁ ]/g, "_");
  const fileName = `${randomUUID()}-${safeName}`;
  const dir = path.join(storageRoot, organizationId);
  await fs.mkdir(dir, { recursive: true });
  const storageKey = path.join(organizationId, fileName);
  const absolutePath = path.join(storageRoot, storageKey);
  const buffer = Buffer.from(contentBase64, "base64");
  await fs.writeFile(absolutePath, buffer);

  return {
    fileName,
    storageKey,
    size: buffer.byteLength,
    absolutePath
  };
}

export function resolveStorageKey(storageKey: string) {
  return path.join(storageRoot, storageKey);
}
