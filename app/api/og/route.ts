import { NextRequest, NextResponse } from "next/server";

function getMeta(html: string, prop: string): string | null {
  // property="..." content="..." or content="..." property="..."
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${prop}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  try {
    new URL(url); // validate
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; facebookexternalhit/1.1)",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(6000),
    });

    const html = await res.text();

    const title = getMeta(html, "og:title") ?? getMeta(html, "twitter:title");
    const image = getMeta(html, "og:image") ?? getMeta(html, "twitter:image");
    const priceRaw =
      getMeta(html, "product:price:amount") ??
      getMeta(html, "og:price:amount") ??
      getMeta(html, "price");
    const price = priceRaw ? parseInt(priceRaw.replace(/[^0-9]/g, ""), 10) || null : null;

    return NextResponse.json({ title, image, price });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }
}
