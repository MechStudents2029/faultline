import { describe, expect, it, vi } from "vitest";
import { readFormat, renderQuakes } from "../src/formatQuakes.js";
import { parseQuakes, type Quake } from "../src/parseQuakes.js";
import { readSort, selectQuakes } from "../src/selectQuakes.js";

const LOW_TIME = 1709913600000;
const EDGE_TIME = 1710000000000;
const HIGH_TIME = 1710086400000;

function feature(
  id: string,
  magnitude: number,
  time: number,
  coordinates: [number, number, number],
): unknown {
  return {
    type: "Feature",
    id,
    properties: {
      mag: magnitude,
      place: `${id} place`,
      time,
    },
    geometry: {
      type: "Point",
      coordinates,
    },
  };
}

const collection = {
  type: "FeatureCollection",
  features: [
    feature("high", 6.2, HIGH_TIME, [140.9, 32.6, 22.4]),
    feature("low", 4.7, LOW_TIME, [-71.2, -27.4, 35]),
    feature("edge", 5, EDGE_TIME, [145.8401, -38.3802, 10]),
  ],
};

function ids(quakes: readonly Quake[]): string[] {
  return quakes.map((quake) => quake.id);
}

describe("sort by depth", () => {
  it("orders by depth ascending and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, ["--sort", "depth"]))).toEqual([
      "edge",
      "high",
      "low",
    ]);
    expect(ids(parsed)).toEqual(["high", "low", "edge"]);
    expect(parsed.map((quake) => quake.depthKm)).toEqual([22.4, 35, 10]);
    expect(readSort(["--sort", "depth"])).toBe("depth");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps feed order when --sort is omitted", () => {
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, []))).toEqual(["high", "low", "edge"]);
    expect(readSort([])).toBeUndefined();
  });

  it("rejects a missing or unknown --sort value and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const parsed = parseQuakes(collection);

    expect(() => readSort(["--sort"])).toThrow(TypeError);
    expect(() => readSort(["--sort"])).toThrow(
      "--sort requires magnitude, time, or depth",
    );
    expect(() => readSort(["--sort", "place"])).toThrow(
      "--sort expects magnitude, time, or depth, received place",
    );
    expect(() => readSort(["--sort", "DEPTH"])).toThrow(
      "--sort expects magnitude, time, or depth, received DEPTH",
    );
    expect(() => readSort(["--sort", "TIME"])).toThrow(
      "--sort expects magnitude, time, or depth, received TIME",
    );
    expect(() => readSort(["--sort", "MAGNITUDE"])).toThrow(
      "--sort expects magnitude, time, or depth, received MAGNITUDE",
    );
    expect(() => selectQuakes(parsed, ["--sort", "place"])).toThrow(
      "--sort expects magnitude, time, or depth, received place",
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("sorts before the limit so the shallowest N remain", () => {
    const parsed = parseQuakes(collection);
    const ascending = ["--sort", "depth", "--limit", "2"];
    const swapped = ["--limit", "2", "--sort", "depth"];

    expect(ids(selectQuakes(parsed, ascending))).toEqual(["edge", "high"]);
    expect(ids(selectQuakes(parsed, swapped))).toEqual(["edge", "high"]);
    expect(
      ids(selectQuakes(parsed, ["--sort", "depth", "--limit", "1"])),
    ).toEqual(["edge"]);
    expect(ids(selectQuakes(parsed, ["--limit", "2"]))).toEqual([
      "high",
      "low",
    ]);
  });

  it("keeps equal depths in feed order", () => {
    const tied = {
      type: "FeatureCollection",
      features: [
        feature("later", 6.2, HIGH_TIME, [140.9, 32.6, 22.4]),
        feature("first", 5, EDGE_TIME, [145.8401, -38.3802, 10]),
        feature("second", 4.7, LOW_TIME, [-71.2, -27.4, 10]),
      ],
    };
    const parsed = parseQuakes(tied);

    expect(ids(selectQuakes(parsed, ["--sort", "depth"]))).toEqual([
      "first",
      "second",
      "later",
    ]);
    expect(ids(parsed)).toEqual(["later", "first", "second"]);
  });

  it("runs after the filters and before the limit", () => {
    const parsed = parseQuakes(collection);
    const filtered = [
      "--min-magnitude",
      "5",
      "--max-magnitude",
      "6.2",
      "--place",
      "place",
      "--min-depth",
      "10",
      "--max-depth",
      "35",
      "--min-time",
      String(EDGE_TIME),
      "--max-time",
      String(EDGE_TIME),
      "--sort",
      "depth",
      "--limit",
      "1",
    ];
    const swapped = [
      "--limit",
      "1",
      "--sort",
      "depth",
      "--max-time",
      String(EDGE_TIME),
      "--min-time",
      String(EDGE_TIME),
      "--max-depth",
      "35",
      "--min-depth",
      "10",
      "--place",
      "place",
      "--max-magnitude",
      "6.2",
      "--min-magnitude",
      "5",
    ];

    expect(
      ids(
        selectQuakes(parsed, ["--min-magnitude", "5", "--sort", "depth"]),
      ),
    ).toEqual(["edge", "high"]);
    expect(ids(selectQuakes(parsed, filtered))).toEqual(["edge"]);
    expect(ids(selectQuakes(parsed, swapped))).toEqual(["edge"]);
    expect(
      ids(
        selectQuakes(parsed, [
          "--max-time",
          String(EDGE_TIME),
          "--sort",
          "depth",
          "--limit",
          "9",
        ]),
      ),
    ).toEqual(["edge", "low"]);
  });

  it("leaves --sort=depth and --Sort unread", () => {
    const parsed = parseQuakes(collection);

    expect(readSort(["--sort=depth"])).toBeUndefined();
    expect(readSort(["--Sort", "depth"])).toBeUndefined();
    expect(ids(selectQuakes(parsed, ["--sort=depth"]))).toEqual([
      "high",
      "low",
      "edge",
    ]);
    expect(ids(selectQuakes(parsed, ["--Sort", "depth"]))).toEqual([
      "high",
      "low",
      "edge",
    ]);
  });

  it("returns no rows when the filters remove every quake", () => {
    const parsed = parseQuakes(collection);
    const selected = selectQuakes(parsed, [
      "--min-time",
      String(HIGH_TIME + 1),
      "--sort",
      "depth",
      "--limit",
      "2",
    ]);

    expect(selected).toEqual([]);
    expect(renderQuakes(selected, "text")).toBe("");
    expect(renderQuakes(selected, "json")).toBe("[]\n");
  });

  it("prints the depth-sorted list as text and json and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const argv = ["--sort", "depth", "--limit", "2", "--format", "text"];
    const selected = selectQuakes(parseQuakes(collection), argv);
    const jsonArgv = ["--sort", "depth", "--limit", "1", "--format", "json"];
    const jsonSelected = selectQuakes(parseQuakes(collection), jsonArgv);

    expect(ids(selected)).toEqual(["edge", "high"]);
    expect(renderQuakes(selected, readFormat(argv))).toBe(
      [
        "magnitude  depth in km  place  UTC time",
        "M 5  10 km  edge place  2024-03-09T16:00:00.000Z",
        "M 6.2  22.4 km  high place  2024-03-10T16:00:00.000Z",
        "2 quakes",
      ].join("\n") + "\n",
    );
    expect(renderQuakes(selected, readFormat(argv))).not.toContain("low place");
    expect(readFormat(jsonArgv)).toBe("json");
    expect(ids(jsonSelected)).toEqual(["edge"]);
    expect(renderQuakes(jsonSelected, "json")).toBe(
      `${JSON.stringify(jsonSelected, null, 2)}\n`,
    );
    expect(jsonSelected[0]?.depthKm).toBe(10);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("still orders time and magnitude when those tokens are set", () => {
    const parsed = parseQuakes(collection);

    expect(readSort(["--sort", "time"])).toBe("time");
    expect(ids(selectQuakes(parsed, ["--sort", "time"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(readSort(["--sort", "magnitude"])).toBe("magnitude");
    expect(ids(selectQuakes(parsed, ["--sort", "magnitude"]))).toEqual([
      "high",
      "edge",
      "low",
    ]);
  });
});
