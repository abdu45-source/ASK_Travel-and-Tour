export const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80';

/**
 * Normalizes an image path or URL.
 * Handles relative paths (/images/...), external URLs (http/https), and missing images.
 */
export function getDestinationImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return '/images/destinations/gondar-fasilides-castle-unesco.jpg';
  }

  const trimmed = url.trim();

  // If already absolute or internet URL, use directly
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // If path doesn't start with leading slash, add it
  if (!trimmed.startsWith('/')) {
    return `/${trimmed}`;
  }

  return trimmed;
}

/**
 * Graceful error handler for <img> tags.
 * Falls back to an authentic Ethiopian Unsplash photo if a local asset fails to load.
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallback = DEFAULT_FALLBACK_IMAGE,
) {
  const target = e.currentTarget;
  if (target.src !== fallback) {
    target.onerror = null; // Prevent infinite loop
    target.src = fallback;
  }
}

