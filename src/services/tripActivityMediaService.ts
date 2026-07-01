export function getActivityImageRotation(imageUrls: string[] | undefined, fallbackImage: string, activityIndex: number, limit = 4) {
  const uniqueImages = Array.from(new Set([...(imageUrls ?? []), fallbackImage].map((image) => image.trim()).filter(Boolean)));
  if (!uniqueImages.length) return [];

  const startIndex = ((activityIndex % uniqueImages.length) + uniqueImages.length) % uniqueImages.length;
  const rotatedImages = [...uniqueImages.slice(startIndex), ...uniqueImages.slice(0, startIndex)];
  return rotatedImages.slice(0, Math.max(1, limit));
}
