const FEED_FLAG = "--feed";

export type QuakeFeed = "day" | "week";

const FEED_URLS: Record<QuakeFeed, string> = {
  day: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson",
  week: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson",
};

const FEED_LABELS: Record<QuakeFeed, string> = {
  day: "significant-day",
  week: "significant-week",
};

function isQuakeFeed(value: string): value is QuakeFeed {
  return value === "day" || value === "week";
}

/**
 * Read `--feed <day|week>` from CLI args.
 * Returns `day` when the flag is omitted, so the default URL is unchanged.
 */
export function readFeed(argv: readonly string[]): QuakeFeed {
  const index = argv.indexOf(FEED_FLAG);
  if (index === -1) {
    return "day";
  }

  const raw = argv[index + 1];
  if (raw === undefined) {
    throw new TypeError("--feed requires day or week");
  }

  if (!isQuakeFeed(raw)) {
    throw new TypeError(`--feed expects day or week, received ${raw}`);
  }

  return raw;
}

/** Public USGS GeoJSON summary URL for a feed. No API key. */
export function feedUrl(feed: QuakeFeed): string {
  return FEED_URLS[feed];
}

/**
 * GET the chosen USGS significant feed and return the parsed JSON body.
 * A non-OK response throws with the feed name, status, and status text.
 */
export async function loadFeed(
  feed: QuakeFeed,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const response = await fetchImpl(feedUrl(feed));
  if (!response.ok) {
    throw new Error(
      `USGS ${FEED_LABELS[feed]} feed failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<unknown>;
}
