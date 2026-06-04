/**
 * In-memory map of `scanId` → fresh-capture local URI (typically a `blob:`
 * URL on web or a `file:` URI on native). Used to show the just-captured
 * image instantly while the upload runs in the background, and as a fallback
 * if the storage path hasn't propagated yet.
 *
 * This map is intentionally NOT persisted. `blob:` URLs are only valid for
 * the document that created them, and `file:` URIs may be cleaned up by the
 * OS — neither survives a reload. The persistent retry path is
 * `pendingPhotoUploads` (which stores the actual bytes).
 */

type Listener = () => void;

const previews = new Map<string, string>();
const listeners = new Set<Listener>();

function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener();
    } catch (err) {
      console.warn("[localPhotoPreviews] listener threw:", err);
    }
  }
}

export function setLocalPhotoPreview(scanId: string, uri: string): void {
  if (!scanId || !uri) return;
  previews.set(scanId, uri);
  notifyListeners();
}

export function getLocalPhotoPreview(scanId: string): string | null {
  return previews.get(scanId) ?? null;
}

export function clearLocalPhotoPreview(scanId: string): void {
  if (previews.delete(scanId)) notifyListeners();
}

export function clearAllLocalPhotoPreviews(): void {
  if (previews.size === 0) return;
  previews.clear();
  notifyListeners();
}

export function subscribeLocalPhotoPreviews(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
