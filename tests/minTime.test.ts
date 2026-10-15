import { describe, expect, it, vi } from "vitest";
import { readFormat, renderQuakes } from "../src/formatQuakes.js";
import { parseQuakes, type Quake } from "../src/parseQuakes.js";
import { readMinTime, selectQuakes } from "../src/selectQuakes.js";

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
    feature("low", 4.7, LOW_TIME, [-71.2, -27.4, 35]),
    feature("edge", 5, EDGE_TIME, [145.8401, -38.3802, 10]),
    feature("high", 6.2, HIGH_TIME, [140.9, 32.6, 22.4]),
  ],
};

function ids(quakes: readonly Quake[]): string[] {
  return quakes.map((quake) => quake.id);
}

describe("min time filter", () => {
  it("keeps quakes at or after the floor and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, ["--min-time", String(EDGE_TIME)]))).toEqual(
      ["edge", "high"],
    );
    expect(ids(parsed)).toEqual(["low", "edge", "high"]);
    expect(parsed.map((quake) => quake.time)).toEqual([
      LOW_TIME,
      EDGE_TIME,
      HIGH_TIME,
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps every time when --min-time is omitted", () => {
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, []))).toEqual(["low", "edge", "high"]);
    expect(readMinTime([])).toBeUndefined();
  });

  it("rejects a missing or non-numeric --min-time value and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect(() => readMinTime(["--min-time"])).toThrow(TypeError);
    expect(() => readMinTime(["--min-time"])).toThrow(
      "--min-time requires a number",
    );
    expect(() => readMinTime(["--min-time", "soon"])).toThrow(TypeError);
    expect(() => readMinTime(["--min-time", "soon"])).toThrow(
      "--min-time expects a finite number, received soon",
    );
    expect(() =>
      selectQuakes(parseQuakes(collection), [
        "--min-time",
        `${EDGE_TIME}ms`,
      ]),
    ).toThrow(
      `--min-time expects a finite number, received ${EDGE_TIME}ms`,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("treats the floor as inclusive", () => {
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, ["--min-time", String(EDGE_TIME)]))).toEqual(
      ["edge", "high"],
    );
    expect(
      ids(selectQuakes(parsed, ["--min-time", String(EDGE_TIME + 1)])),
    ).toEqual(["high"]);
    expect(ids(selectQuakes(parsed, ["--min-time", String(HIGH_TIME)]))).toEqual(
      ["high"],
    );
    expect(ids(selectQuakes(parsed, ["--min-time", String(LOW_TIME)]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(
      ids(selectQuakes(parsed, ["--min-time", String(HIGH_TIME + 1)])),
    ).toEqual([]);
  });

  it("ignores a joined flag because --min-time is its own token", () => {
    const parsed = parseQuakes(collection);

    expect(readMinTime([`--min-time=${EDGE_TIME}`])).toBeUndefined();
    expect(ids(selectQuakes(parsed, [`--min-time=${EDGE_TIME}`]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(readMinTime(["--Min-time", String(EDGE_TIME)])).toBeUndefined();
  });

  it("filters by min time with the other filters before sort and limit", () => {
    const parsed = parseQuakes(collection);
    const argv = [
      "--min-time",
      String(EDGE_TIME),
      "--max-magnitude",
      "5",
      "--min-magnitude",
      "4.7",
      "--min-depth",
      "10",
      "--max-depth",
      "35",
      "--place",
      "place",
      "--sort",
      "magnitude",
      "--limit",
      "1",
    ];
    const swapped = [
      "--limit",
      "1",
      "--sort",
      "magnitude",
      "--place",
      "place",
      "--max-depth",
      "35",
      "--min-depth",
      "10",
      "--min-magnitude",
      "4.7",
      "--max-magnitude",
      "5",
      "--min-time",
      String(EDGE_TIME),
    ];

    expect(ids(selectQuakes(parsed, argv))).toEqual(["edge"]);
    expect(ids(selectQuakes(parsed, swapped))).toEqual(["edge"]);
    expect(ids(parsed)).toEqual(["low", "edge", "high"]);
    expect(
      ids(
        selectQuakes(parsed, [
          "--min-time",
          String(EDGE_TIME),
          "--place",
          "edge",
          "--sort",
          "magnitude",
          "--limit",
          "2",
        ]),
      ),
    ).toEqual(["edge"]);
    expect(
      ids(
        selectQuakes(parsed, ["--min-time", String(EDGE_TIME), "--limit", "9"]),
      ),
    ).toEqual(["edge", "high"]);
  });

  it("returns no rows when every quake is earlier than the floor", () => {
    const parsed = parseQuakes(collection);
    const selected = selectQuakes(parsed, [
      "--min-time",
      String(HIGH_TIME + 1),
      "--limit",
      "2",
    ]);

    expect(selected).toEqual([]);
    expect(renderQuakes(selected, "text")).toBe("");
    expect(renderQuakes(selected, "json")).toBe("[]\n");
  });

  it("prints the time-filtered list as text and json and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const argv = ["--min-time", String(HIGH_TIME), "--format", "text"];
    const selected = selectQuakes(parseQuakes(collection), argv);
    const jsonArgv = [
      "--min-time",
      String(EDGE_TIME),
      "--place",
      "edge",
      "--format",
      "json",
    ];
    const jsonSelected = selectQuakes(parseQuakes(collection), jsonArgv);

    expect(ids(selected)).toEqual(["high"]);
    expect(renderQuakes(selected, readFormat(argv))).toBe(
      [
        "magnitude  depth in km  place  UTC time",
        "M 6.2  22.4 km  high place  2024-03-10T16:00:00.000Z",
        "1 quake",
      ].join("\n") + "\n",
    );
    expect(readFormat(jsonArgv)).toBe("json");
    expect(ids(jsonSelected)).toEqual(["edge"]);
    expect(renderQuakes(jsonSelected, "json")).toBe(
      `${JSON.stringify(jsonSelected, null, 2)}\n`,
    );
    expect(jsonSelected[0]?.time).toBe(EDGE_TIME);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("accepts a finite decimal, sign, or exponent as an epoch time", () => {
    const parsed = parseQuakes(collection);

    expect(readMinTime(["--min-time", "1.71e12"])).toBe(EDGE_TIME);
    expect(ids(selectQuakes(parsed, ["--min-time", "1.71e12"]))).toEqual([
      "edge",
      "high",
    ]);
    expect(readMinTime(["--min-time", `+${EDGE_TIME}`])).toBe(EDGE_TIME);
    expect(ids(selectQuakes(parsed, ["--min-time", `+${EDGE_TIME}`]))).toEqual([
      "edge",
      "high",
    ]);
    expect(
      ids(selectQuakes(parsed, ["--min-time", `${HIGH_TIME}.0`])),
    ).toEqual(["high"]);
    expect(ids(selectQuakes(parsed, ["--min-time", "1.7099136e12"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
  });

  it("keeps the positive epoch times when the floor is zero or negative", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const parsed = parseQuakes(collection);

    expect(readMinTime(["--min-time", "0"])).toBe(0);
    expect(ids(selectQuakes(parsed, ["--min-time", "0"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(readMinTime(["--min-time", "-1"])).toBe(-1);
    expect(ids(selectQuakes(parsed, ["--min-time", "-1"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
