export type ResolvedMapLocation = {
  latitude: number;
  longitude: number;
};

type RedirectFetcher = (input: string, init?: RequestInit) => Promise<Pick<Response, "url">>;

function validCoordinates(latitude: number, longitude: number): ResolvedMapLocation | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function fromPair(first: string | null, second: string | null, longitudeFirst: boolean) {
  if (first == null || second == null) return null;
  const firstNumber = Number(first);
  const secondNumber = Number(second);
  return longitudeFirst
    ? validCoordinates(secondNumber, firstNumber)
    : validCoordinates(firstNumber, secondNumber);
}

export function parseMapCoordinates(value: string): ResolvedMapLocation | null {
  const input = value.trim();
  if (!input) return null;

  const googleMatch = input.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,|$)/);
  if (googleMatch) return fromPair(googleMatch[1], googleMatch[2], false);

  try {
    const url = new URL(input);
    const latitude = url.searchParams.get("latitude") ?? url.searchParams.get("lat");
    const longitude = url.searchParams.get("longitude") ?? url.searchParams.get("lon") ?? url.searchParams.get("lng");
    const generic = fromPair(latitude, longitude, false);
    if (generic) return generic;

    const mapCenter = url.searchParams.get("m") ?? url.searchParams.get("ll");
    if (mapCenter) {
      const [first, second] = mapCenter.split(/[,\s/]+/);
      const providerCoordinates = fromPair(first, second, true);
      if (providerCoordinates) return providerCoordinates;
    }
  } catch {
    const pair = input.match(/^(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)$/);
    if (pair) return fromPair(pair[1], pair[2], false);
  }

  return null;
}

export async function resolveMapLocationInput(
  value: string,
  redirectFetcher: RedirectFetcher = fetch,
): Promise<ResolvedMapLocation | null> {
  const direct = parseMapCoordinates(value);
  if (direct) return direct;
  try {
    const response = await redirectFetcher(value, { method: "HEAD", redirect: "follow" });
    return response.url ? parseMapCoordinates(response.url) : null;
  } catch {
    return null;
  }
}
