import "server-only";

import { AppError } from "@/lib/errors";
import type { UploadImage } from "@/lib/data/repository";
import { MAX_ITEM_IMAGES } from "@/lib/validation/schemas";

// Images are resized and re-encoded in the browser before upload, so anything
// larger than this did not come from our form.
export const MAX_IMAGE_SIZE_BYTES = 1024 * 1024;

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/**
 * Identifies the image type from the file's first bytes. The browser-supplied
 * MIME type and file name are attacker-controlled and are deliberately ignored.
 */
function sniffImage(bytes: Uint8Array): Pick<UploadImage, "mime" | "ext"> | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: "image/png", ext: "png" };
  }
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

/** Reads and validates the uploaded files of a form field. Throws AppError on a bad file. */
export async function readUploadedImages(
  formData: FormData,
  field: string,
  maxCount = MAX_ITEM_IMAGES,
): Promise<UploadImage[]> {
  const files = formData
    .getAll(field)
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length > maxCount) {
    throw new AppError("TOO_MANY_IMAGES");
  }

  const images: UploadImage[] = [];
  for (const file of files) {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new AppError("INVALID_IMAGE");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffImage(bytes);
    if (!type) {
      throw new AppError("INVALID_IMAGE");
    }
    images.push({ bytes, ...type });
  }
  return images;
}
