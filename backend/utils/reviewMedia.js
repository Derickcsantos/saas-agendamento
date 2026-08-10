const ALLOWED_TYPES = new Map([
  ["image/jpeg", { extension: "jpg", kind: "image" }],
  ["image/png", { extension: "png", kind: "image" }],
  ["image/webp", { extension: "webp", kind: "image" }],
  ["video/mp4", { extension: "mp4", kind: "video" }],
  ["video/webm", { extension: "webm", kind: "video" }],
  ["video/quicktime", { extension: "mov", kind: "video" }],
]);

export function getReviewMediaType(mimetype) {
  return ALLOWED_TYPES.get(String(mimetype || "").toLowerCase()) || null;
}

export function hasValidReviewMediaSignature(file) {
  const buffer = file?.buffer;
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  const type = String(file.mimetype || "").toLowerCase();
  if (type === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (type === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === "image/webp") return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  if (type === "video/webm") return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (type === "video/mp4" || type === "video/quicktime") return buffer.toString("ascii", 4, 8) === "ftyp";
  return false;
}
