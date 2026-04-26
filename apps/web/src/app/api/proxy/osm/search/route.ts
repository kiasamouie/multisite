import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy for OpenStreetMap Nominatim address search.
 * Nominatim requires a valid User-Agent and has a 1 req/s rate limit —
 * keeping this server-side lets us set the header and avoids CORS.
 *
 * Free, no API key required.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ items: [] });
  }

  const params = new URLSearchParams({
    q,
    format: "json",
    addressdetails: "1",
    limit: "8",
  });

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        "User-Agent": "Multisite-SaaS-Builder/1.0",
        "Accept-Language": request.headers.get("accept-language") ?? "en",
      },
      // Nominatim results change infrequently for identical queries
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ items: [], error: "upstream_error" }, { status: 502 });
    }

    const data = (await res.json()) as Array<{
      place_id: number;
      lat: string;
      lon: string;
      display_name: string;
      boundingbox: [string, string, string, string];
      type?: string;
      address?: Record<string, string>;
    }>;

    const items = data.map((r) => {
      const lat = parseFloat(r.lat);
      const lon = parseFloat(r.lon);
      // bbox comes as [minLat, maxLat, minLon, maxLon]; OSM embed wants (minLon,minLat,maxLon,maxLat)
      const [minLat, maxLat, minLon, maxLon] = r.boundingbox.map(parseFloat);
      const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${lat}%2C${lon}`;
      const addr = r.address ?? {};
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.hamlet ||
        addr.municipality ||
        "";

      return {
        id: String(r.place_id),
        label: r.display_name,
        subtitle: r.type,
        meta: {
          lat,
          lng: lon,
          placeId: r.place_id,
          embedUrl,
          address: r.display_name,
          city,
          country: addr.country ?? "",
          postcode: addr.postcode ?? "",
        },
      };
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("Nominatim proxy error:", err);
    return NextResponse.json({ items: [], error: "network_error" }, { status: 502 });
  }
}
