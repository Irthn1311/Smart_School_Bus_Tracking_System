/// <reference types="google.maps" />
import { Loader } from '@googlemaps/js-api-loader';

// Debug: confirm this module is evaluated in the browser
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.log('[GMaps] loader module loaded');
}

let loaderInstance: Loader | null = null;
let loadPromise: Promise<typeof google> | null = null;

/**
 * Get Google Maps API key from environment
 */
function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_GMAPS_API_KEY;
  if (!key) {
    throw new Error(
      'NEXT_PUBLIC_GMAPS_API_KEY is not set. Please add it to your .env.local file.'
    );
  }
  return key;
}

/**
 * Initialize and load Google Maps JavaScript API
 * Returns a promise that resolves when the API is loaded
 */
export async function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === 'undefined') {
    throw new Error('Google Maps can only be loaded in the browser');
  }

  // Debug: confirm key presence without exposing full key
  try {
    const key = getApiKey();
    const masked = key.length > 8 ? `${key.slice(0, 4)}****${key.slice(-4)}` : '****';
    // eslint-disable-next-line no-console
    console.log('[GMaps] Using API key:', masked);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[GMaps] Missing API key:', e);
    throw e;
  }

  // If already loaded, return immediately
  if (window.google?.maps) {
    return window.google as typeof google;
  }

  // If already loading, return the existing promise
  if (loadPromise) {
    return loadPromise;
  }

  // Create loader instance
  loaderInstance = new Loader({
    apiKey: getApiKey(),
    version: 'weekly',
    libraries: ['places', 'geometry', 'routes'], // Places for Autocomplete, Geometry for polyline decoding, Routes for Directions
  });

  // Start loading
  const loader = loaderInstance.load();

  // Timeout guard: fail fast if script hangs (adblock/network)
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => {
      reject(new Error('Google Maps loading timed out. Check network/adblock/API restrictions.'));
    }, 15000)
  );

  loadPromise = Promise.race([loader, timeout])
    .then(async () => {
      // Wait a bit more to ensure all constructors are available
      return new Promise<typeof google>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 20; // Increased for geometry library
        
        const checkReady = async () => {
          if (window.google?.maps?.Map) {
            // Also check for geometry library
            if (window.google?.maps?.geometry?.encoding) {
              console.log('[GMaps] All libraries loaded including geometry');
              resolve(window.google as typeof google);
            } else if (attempts < maxAttempts) {
              attempts++;
              // Try to import geometry library if not available
              if (typeof (window.google?.maps as any)?.importLibrary === 'function') {
                try {
                  await (window.google.maps as any).importLibrary('geometry');
                  console.log('[GMaps] Geometry library imported');
                } catch (e) {
                  console.warn('[GMaps] Failed to import geometry library:', e);
                }
              }
              setTimeout(checkReady, 100);
            } else {
              console.warn('[GMaps] Geometry library not available but continuing');
              resolve(window.google as typeof google);
            }
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkReady, 100);
          } else {
            reject(new Error('Google Maps Map constructor is not available after loading'));
          }
        };
        
        checkReady();
      });
    })
    .catch((e) => {
      // Surface common errors clearly in console
      console.error('Google Maps Loader Error:', e);
      // Re-throw so UI can render fallback/error state
      throw e;
    });

  return loadPromise;
}

/**
 * Get Google Maps API instance (must be called after loadGoogleMaps)
 */
export function getGoogle(): typeof google {
  if (typeof window === 'undefined' || !window.google?.maps) {
    throw new Error(
      'Google Maps API is not loaded. Call loadGoogleMaps() first.'
    );
  }
  return window.google as typeof google;
}

/**
 * Check if Google Maps is already loaded
 */
export function isGoogleMapsLoaded(): boolean {
  return typeof window !== 'undefined' && !!window.google?.maps;
}

