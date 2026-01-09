/**
 * Geolocation utility with progressive fallback strategy.
 * Tries high accuracy first, then falls back to low accuracy if that fails.
 */

export type LocationErrorType = 'permission_denied' | 'unavailable' | 'timeout';

export interface LocationResult {
  success: boolean;
  coords?: { latitude: number; longitude: number };
  error?: LocationErrorType;
  errorMessage?: string;
}

/**
 * Get user's current location with progressive fallback.
 * First tries high accuracy (GPS), then falls back to low accuracy (WiFi/cell).
 */
export async function getLocation(): Promise<LocationResult> {
  // Check if geolocation is supported
  if (!navigator.geolocation) {
    return {
      success: false,
      error: 'unavailable',
      errorMessage: 'Location is not supported on this device',
    };
  }

  // Try high accuracy first (GPS)
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000, // 15 seconds for high accuracy
        maximumAge: 60000, // Accept 1-minute old location
      });
    });

    return {
      success: true,
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
    };
  } catch (highAccuracyError: any) {
    // If permission denied, don't retry with low accuracy
    if (highAccuracyError.code === 1) {
      return {
        success: false,
        error: 'permission_denied',
        errorMessage: 'Location permission was denied. Please enable location access in your browser settings.',
      };
    }

    // Try low accuracy as fallback (WiFi/cell tower)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000, // 10 seconds for low accuracy
          maximumAge: 300000, // Accept 5-minute old location
        });
      });

      return {
        success: true,
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
      };
    } catch (lowAccuracyError: any) {
      // Classify the final error
      if (lowAccuracyError.code === 1) {
        return {
          success: false,
          error: 'permission_denied',
          errorMessage: 'Location permission was denied. Please enable location access in your browser settings.',
        };
      } else if (lowAccuracyError.code === 2) {
        return {
          success: false,
          error: 'unavailable',
          errorMessage: 'Unable to detect your location. Please check if GPS or WiFi is enabled.',
        };
      } else {
        return {
          success: false,
          error: 'timeout',
          errorMessage: 'Location request timed out. Please try again.',
        };
      }
    }
  }
}

/**
 * Get user-friendly error title based on error type
 */
export function getLocationErrorTitle(error: LocationErrorType): string {
  switch (error) {
    case 'permission_denied':
      return 'Location Permission Required';
    case 'unavailable':
      return 'Unable to Detect Location';
    case 'timeout':
      return 'Location Request Timed Out';
    default:
      return 'Location Error';
  }
}

/**
 * Get user-friendly instructions based on error type
 */
export function getLocationErrorInstructions(error: LocationErrorType): string {
  switch (error) {
    case 'permission_denied':
      return 'Please enable location access in your browser settings and try again.';
    case 'unavailable':
      return 'Make sure GPS or WiFi is enabled on your device, then try again.';
    case 'timeout':
      return 'Getting your location took too long. Please ensure you have a good signal and try again.';
    default:
      return 'Please try again.';
  }
}
