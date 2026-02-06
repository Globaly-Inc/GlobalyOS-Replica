/**
 * Reverse-geocode coordinates to a human-readable location name via Nominatim.
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
    );
    if (response.ok) {
      const data = await response.json();
      const city =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        '';
      const state = data.address?.state || '';
      return [city, state].filter(Boolean).join(', ') || 'Location detected';
    }
  } catch {
    // Nominatim errors are non-critical
  }
  return 'Location detected';
};
