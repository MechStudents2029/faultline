import { describe, expect, it, vi } from "vitest";
import { readFormat, renderQuakes } from "../src/formatQuakes.js";
import { parseQuakes, type Quake } from "../src/parseQuakes.js";
import { readMaxTime, selectQuakes } from "../src/selectQuakes.js";

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

describe("max time filter", () => {
  it("keeps quakes at or before the ceiling and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, ["--max-time", String(EDGE_TIME)]))).toEqual(
      ["low", "edge"],
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

  it("keeps every time when --max-time is omitted", () => {
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, []))).toEqual(["low", "edge", "high"]);
    expect(readMaxTime([])).toBeUndefined();
  });

  it("rejects a missing or non-numeric --max-time value and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect(() => readMaxTime(["--max-time"])).toThrow(TypeError);
    expect(() => readMaxTime(["--max-time"])).toThrow(
      "--max-time requires a number",
    );
    expect(() => readMaxTime(["--max-time", "soon"])).toThrow(TypeError);
    expect(() => readMaxTime(["--max-time", "soon"])).toThrow(
      "--max-time expects a finite number, received soon",
    );
    expect(() =>
      selectQuakes(parseQuakes(collection), [
        "--max-time",
        `${EDGE_TIME}ms`,
      ]),
    ).toThrow(
      `--max-time expects a finite number, received ${EDGE_TIME}ms`,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("treats the ceiling as inclusive", () => {
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, ["--max-time", String(EDGE_TIME)]))).toEqual(
      ["low", "edge"],
    );
    expect(
      ids(selectQuakes(parsed, ["--max-time", String(EDGE_TIME - 1)])),
    ).toEqual(["low"]);
    expect(ids(selectQuakes(parsed, ["--max-time", String(LOW_TIME)]))).toEqual([
      "low",
    ]);
    expect(ids(selectQuakes(parsed, ["--max-time", String(HIGH_TIME)]))).toEqual(
      ["low", "edge", "high"],
    );
    expect(
      ids(selectQuakes(parsed, ["--max-time", String(LOW_TIME - 1)])),
    ).toEqual([]);
  });

  it("ignores a joined flag because --max-time is its own token", () => {
    const parsed = parseQuakes(collection);

    expect(readMaxTime([`--max-time=${EDGE_TIME}`])).toBeUndefined();
    expect(ids(selectQuakes(parsed, [`--max-time=${EDGE_TIME}`]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(readMaxTime(["--Max-time", String(EDGE_TIME)])).toBeUndefined();
  });

  it("filters by max time with the other filters before sort and limit", () => {
    const parsed = parseQuakes(collection);
    const argv = [
      "--max-time",
      String(EDGE_TIME),
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
      "--max-time",
      String(EDGE_TIME),
    ];

    expect(ids(selectQuakes(parsed, argv))).toEqual(["edge"]);
    expect(ids(selectQuakes(parsed, swapped))).toEqual(["edge"]);
    expect(ids(parsed)).toEqual(["low", "edge", "high"]);
    expect(
      ids(
        selectQuakes(parsed, [
          "--max-time",
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
        selectQuakes(parsed, ["--max-time", String(EDGE_TIME), "--limit", "9"]),
      ),
    ).toEqual(["low", "edge"]);
  });

  it("returns no rows when every quake is later than the ceiling", () => {
    const parsed = parseQuakes(collection);
    const selected = selectQuakes(parsed, [
      "--max-time",
      String(LOW_TIME - 1),
      "--limit",
      "2",
    ]);

    expect(selected).toEqual([]);
    expect(renderQuakes(selected, "text")).toBe("");
    expect(renderQuakes(selected, "json")).toBe("[]\n");
    expect(
      ids(
        selectQuakes(parsed, [
          "--min-time",
          String(HIGH_TIME),
          "--max-time",
          String(EDGE_TIME),
        ]),
      ),
    ).toEqual([]);
  });

  it("prints the time-filtered list as text and json and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const argv = ["--max-time", String(LOW_TIME), "--format", "text"];
    const selected = selectQuakes(parseQuakes(collection), argv);
    const jsonArgv = [
      "--max-time",
      String(EDGE_TIME),
      "--place",
      "edge",
      "--format",
      "json",
    ];
    const jsonSelected = selectQuakes(parseQuakes(collection), jsonArgv);

    expect(ids(selected)).toEqual(["low"]);
    expect(renderQuakes(selected, readFormat(argv))).toBe(
      [
        "magnitude  depth in km  place  UTC time",
        "M 4.7  35 km  low place  2024-03-08T16:00:00.000Z",
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

    expect(readMaxTime(["--max-time", "1.71e12"])).toBe(EDGE_TIME);
    expect(ids(selectQuakes(parsed, ["--max-time", "1.71e12"]))).toEqual([
      "low",
      "edge",
    ]);
    expect(readMaxTime(["--max-time", `+${EDGE_TIME}`])).toBe(EDGE_TIME);
    expect(ids(selectQuakes(parsed, ["--max-time", `+${EDGE_TIME}`]))).toEqual([
      "low",
      "edge",
    ]);
    expect(
      ids(selectQuakes(parsed, ["--max-time", `${LOW_TIME}.0`])),
    ).toEqual(["low"]);
    expect(ids(selectQuakes(parsed, ["--max-time", "1.7100864e12"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
  });

  it("drops the positive epoch times when the ceiling is zero or negative", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const parsed = parseQuakes(collection);

    expect(readMaxTime(["--max-time", "0"])).toBe(0);
    expect(ids(selectQuakes(parsed, ["--max-time", "0"]))).toEqual([]);
    expect(readMaxTime(["--max-time", "-1"])).toBe(-1);
    expect(ids(selectQuakes(parsed, ["--max-time", "-1"]))).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
