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

describe("sort by time", () => {
  it("orders by time ascending and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, ["--sort", "time"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(ids(parsed)).toEqual(["high", "low", "edge"]);
    expect(parsed.map((quake) => quake.time)).toEqual([
      HIGH_TIME,
      LOW_TIME,
      EDGE_TIME,
    ]);
    expect(readSort(["--sort", "time"])).toBe("time");
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
      "--sort requires magnitude or time",
    );
    expect(() => readSort(["--sort", "depth"])).toThrow(
      "--sort expects magnitude or time, received depth",
    );
    expect(() => readSort(["--sort", "TIME"])).toThrow(
      "--sort expects magnitude or time, received TIME",
    );
    expect(() => readSort(["--sort", "MAGNITUDE"])).toThrow(
      "--sort expects magnitude or time, received MAGNITUDE",
    );
    expect(() => selectQuakes(parsed, ["--sort", "place"])).toThrow(
      "--sort expects magnitude or time, received place",
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("sorts before the limit so the oldest N remain", () => {
    const parsed = parseQuakes(collection);
    const ascending = ["--sort", "time", "--limit", "2"];
    const swapped = ["--limit", "2", "--sort", "time"];

    expect(ids(selectQuakes(parsed, ascending))).toEqual(["low", "edge"]);
    expect(ids(selectQuakes(parsed, swapped))).toEqual(["low", "edge"]);
    expect(ids(selectQuakes(parsed, ["--sort", "time", "--limit", "1"]))).toEqual(
      ["low"],
    );
    expect(ids(selectQuakes(parsed, ["--limit", "2"]))).toEqual([
      "high",
      "low",
    ]);
  });

  it("keeps equal times in feed order", () => {
    const tied = {
      type: "FeatureCollection",
      features: [
        feature("later", 6.2, HIGH_TIME, [140.9, 32.6, 22.4]),
        feature("first", 5, EDGE_TIME, [145.8401, -38.3802, 10]),
        feature("second", 4.7, EDGE_TIME, [-71.2, -27.4, 35]),
      ],
    };
    const parsed = parseQuakes(tied);

    expect(ids(selectQuakes(parsed, ["--sort", "time"]))).toEqual([
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
      "time",
      "--limit",
      "1",
    ];
    const swapped = [
      "--limit",
      "1",
      "--sort",
      "time",
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
        selectQuakes(parsed, ["--min-magnitude", "5", "--sort", "time"]),
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
          "time",
          "--limit",
          "9",
        ]),
      ),
    ).toEqual(["low", "edge"]);
  });

  it("leaves --sort=time and --Sort unread", () => {
    const parsed = parseQuakes(collection);

    expect(readSort(["--sort=time"])).toBeUndefined();
    expect(readSort(["--Sort", "time"])).toBeUndefined();
    expect(ids(selectQuakes(parsed, ["--sort=time"]))).toEqual([
      "high",
      "low",
      "edge",
    ]);
    expect(ids(selectQuakes(parsed, ["--Sort", "time"]))).toEqual([
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
      "time",
      "--limit",
      "2",
    ]);

    expect(selected).toEqual([]);
    expect(renderQuakes(selected, "text")).toBe("");
    expect(renderQuakes(selected, "json")).toBe("[]\n");
  });

  it("prints the time-sorted list as text and json and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const argv = ["--sort", "time", "--limit", "2", "--format", "text"];
    const selected = selectQuakes(parseQuakes(collection), argv);
    const jsonArgv = ["--sort", "time", "--limit", "1", "--format", "json"];
    const jsonSelected = selectQuakes(parseQuakes(collection), jsonArgv);

    expect(ids(selected)).toEqual(["low", "edge"]);
    expect(renderQuakes(selected, readFormat(argv))).toBe(
      [
        "magnitude  depth in km  place  UTC time",
        "M 4.7  35 km  low place  2024-03-08T16:00:00.000Z",
        "M 5  10 km  edge place  2024-03-09T16:00:00.000Z",
        "2 quakes",
      ].join("\n") + "\n",
    );
    expect(renderQuakes(selected, readFormat(argv))).not.toContain("high place");
    expect(readFormat(jsonArgv)).toBe("json");
    expect(ids(jsonSelected)).toEqual(["low"]);
    expect(renderQuakes(jsonSelected, "json")).toBe(
      `${JSON.stringify(jsonSelected, null, 2)}\n`,
    );
    expect(jsonSelected[0]?.time).toBe(LOW_TIME);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("still orders magnitude descending when that token is set", () => {
    const parsed = parseQuakes(collection);

    expect(readSort(["--sort", "magnitude"])).toBe("magnitude");
    expect(ids(selectQuakes(parsed, ["--sort", "magnitude"]))).toEqual([
      "high",
      "edge",
      "low",
    ]);
  });
});
