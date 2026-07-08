import "server-only";

/**
 * UK postcode geocoding via postcodes.io (free, no key, ONS data).
 * Called server-side when a postcode is saved; coordinates are stored so
 * matching never geocodes at read time.
 */

export type GeocodeResult = {
  postcode: string; // normalised, e.g. "M1 1AE"
  latitude: number;
  longitude: number;
};

export async function geocodePostcode(raw: string): Promise<GeocodeResult | null> {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(cleaned)) return null;

  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      result?: { postcode: string; latitude: number | null; longitude: number | null };
    };
    const r = body.result;
    if (!r || r.latitude == null || r.longitude == null) return null;
    return { postcode: r.postcode, latitude: r.latitude, longitude: r.longitude };
  } catch {
    return null; // network failure never blocks a profile save
  }
}
