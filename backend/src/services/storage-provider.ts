import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { env } from "../config/env";
import { AppError } from "../middleware/errors";

export type StorageUpload = {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
};

export type StoredFile = {
  url: string;
  mimeType: string;
  size: number;
};

export interface StorageProvider {
  upload(file: StorageUpload): Promise<StoredFile>;
}

const imageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

export class LocalStorageProvider implements StorageProvider {
  async upload(file: StorageUpload): Promise<StoredFile> {
    const extension = imageTypes.get(file.mimeType);
    if (!extension || !hasExpectedSignature(file.buffer, file.mimeType)) {
      throw new AppError(415, "UPLOAD_IMAGE_TYPE_UNSUPPORTED", "Only valid JPEG, PNG, and WebP images are allowed");
    }
    if (file.buffer.length > env.ADMIN_UPLOAD_MAX_BYTES) {
      throw new AppError(413, "UPLOAD_TOO_LARGE", "Image exceeds the configured upload size limit");
    }
    const filename = `${randomUUID()}${extension}`;
    const directory = resolve(process.cwd(), env.ADMIN_UPLOAD_DIR);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, filename), file.buffer, { flag: "wx" });
    return {
      url: `/uploads/${filename}`,
      mimeType: file.mimeType,
      size: file.buffer.length,
    };
  }
}

function hasExpectedSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return (
    mimeType === "image/webp" &&
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  );
}
