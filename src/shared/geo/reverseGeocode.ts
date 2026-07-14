export async function reverseGeocodeCity(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ru`;
    const res = await fetch(url, { headers: { "User-Agent": "AskPlatform/1.0" } });
    if (!res.ok) return null;
    const data = await res.json();
    const address = data.address;
    if (!address) return null;
    return address.city || address.town || address.village || address.hamlet || null;
  } catch {
    return null;
  }
}
