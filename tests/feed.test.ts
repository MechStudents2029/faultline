import { describe, expect, it, vi } from "vitest";
import { feedUrl, loadFeed, readFeed } from "../src/feed.js";
import { renderQuakes } from "../src/formatQuakes.js";
import { parseQuakes } from "../src/parseQuakes.js";
import { selectQuakes } from "../src/selectQuakes.js";

const DAY_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson";
const WEEK_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson";

function feature(id: string, magnitude: number, time: number, depthKm: number) {
  return {
    type: "Feature",
    id,
    properties: { mag: magnitude, place: `${id} place`, time },
    geometry: { type: "Point", coordinates: [140.9, 32.6, depthKm] },
  };
}

const week = {
  type: "FeatureCollection",
  features: [
    feature("tue", 6.1, 1710086400000, 22.4),
    feature("mon", 4.9, 1710000000000, 35),
    feature("sun", 7.0, 1709913600000, 10),
  ],
};

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("--feed", () => {
  it("defaults to the significant-day feed", () => {
    expect(readFeed([])).toBe("day");
    expect(readFeed(["--feed", "day"])).toBe("day");
    expect(feedUrl("day")).toBe(DAY_URL);
  });

  it("selects the significant-week feed", () => {
    expect(readFeed(["--feed", "week"])).toBe("week");
    expect(readFeed(["--limit", "2", "--feed", "week"])).toBe("week");
    expect(feedUrl("week")).toBe(WEEK_URL);
  });

  it("rejects a missing or unknown value before fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect(() => readFeed(["--feed"])).toThrow(TypeError);
    expect(() => readFeed(["--feed"])).toThrow("--feed requires day or week");
    expect(() => readFeed(["--feed", "month"])).toThrow(
      "--feed expects day or week, received month",
    );
    expect(() => readFeed(["--feed", "WEEK"])).toThrow(
      "--feed expects day or week, received WEEK",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("leaves --feed=week and --Feed unread", () => {
    expect(readFeed(["--feed=week"])).toBe("day");
    expect(readFeed(["--Feed", "week"])).toBe("day");
  });

  it("GETs the chosen URL with no auth header", async () => {
    const stub = vi.fn(async () => okResponse(week));

    await expect(loadFeed("week", stub as unknown as typeof fetch)).resolves.toEqual(week);
    await loadFeed("day", stub as unknown as typeof fetch);

    expect(stub).toHaveBeenNthCalledWith(1, WEEK_URL);
    expect(stub).toHaveBeenNthCalledWith(2, DAY_URL);
  });

  it("names the feed in a non-OK error", async () => {
    const stub = vi.fn(
      async () => new Response("", { status: 503, statusText: "Service Unavailable" }),
    );

    await expect(loadFeed("week", stub as unknown as typeof fetch)).rejects.toThrow(
      "USGS significant-week feed failed: 503 Service Unavailable",
    );
    await expect(loadFeed("day", stub as unknown as typeof fetch)).rejects.toThrow(
      "USGS significant-day feed failed: 503 Service Unavailable",
    );
  });

  it("runs the filters, sort, limit, and format on the week list", async () => {
    const stub = vi.fn(async () => okResponse(week));
    const argv = [
      "--feed",
      "week",
      "--min-magnitude",
      "5",
      "--sort",
      "time",
      "--limit",
      "2",
      "--format",
      "text",
    ];

    const parsed = parseQuakes(
      await loadFeed(readFeed(argv), stub as unknown as typeof fetch),
    );
    const selected = selectQuakes(parsed, argv);

    expect(stub).toHaveBeenCalledWith(WEEK_URL);
    expect(selected.map((quake) => quake.id)).toEqual(["sun", "tue"]);
    expect(renderQuakes(selected, "text")).toBe(
      [
        "magnitude  depth in km  place  UTC time",
        "M 7  10 km  sun place  2024-03-08T16:00:00.000Z",
        "M 6.1  22.4 km  tue place  2024-03-10T16:00:00.000Z",
        "2 quakes",
      ].join("\n") + "\n",
    );
  });
});
