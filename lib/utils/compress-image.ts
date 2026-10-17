const MAX_DIMENSION = 1280;
const TARGET_BYTES = 700 * 1024;

/**
 * Shrinks and re-encodes a photo as JPEG in the browser. This keeps uploads
 * small on mobile data and strips metadata such as the GPS position that phone
 * cameras embed in pictures.
 */
export async function compressImage(file: File): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    for (const quality of [0.82, 0.7, 0.55, 0.4]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size <= TARGET_BYTES) {
        return new File([blob], "photo.jpg", { type: "image/jpeg" });
      }
    }
    return null;
  } catch {
    return null;
  }
}
