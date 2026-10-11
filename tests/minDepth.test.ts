import { describe, expect, it, vi } from "vitest";
import { readFormat, renderQuakes } from "../src/formatQuakes.js";
import { parseQuakes, type Quake } from "../src/parseQuakes.js";
import { readMinDepth, selectQuakes } from "../src/selectQuakes.js";

function feature(
  id: string,
  magnitude: number,
  coordinates: [number, number, number],
): unknown {
  return {
    type: "Feature",
    id,
    properties: {
      mag: magnitude,
      place: `${id} place`,
      time: 1710000000000,
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
    feature("low", 4.7, [-71.2, -27.4, 35]),
    feature("edge", 5, [145.8401, -38.3802, 10]),
    feature("high", 6.2, [140.9, 32.6, 22.4]),
  ],
};

function ids(quakes: readonly Quake[]): string[] {
  return quakes.map((quake) => quake.id);
}

describe("min depth filter", () => {
  it("keeps quakes at least as deep as the floor and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, ["--min-depth", "22.4"]))).toEqual([
      "low",
      "high",
    ]);
    expect(ids(parsed)).toEqual(["low", "edge", "high"]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps every depth when --min-depth is omitted", () => {
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, []))).toEqual(["low", "edge", "high"]);
    expect(readMinDepth([])).toBeUndefined();
  });

  it("rejects a missing or non-numeric --min-depth value and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect(() => readMinDepth(["--min-depth"])).toThrow(TypeError);
    expect(() => readMinDepth(["--min-depth"])).toThrow(
      "--min-depth requires a number",
    );
    expect(() => readMinDepth(["--min-depth", "shallow"])).toThrow(TypeError);
    expect(() => readMinDepth(["--min-depth", "shallow"])).toThrow(
      "--min-depth expects a finite number, received shallow",
    );
    expect(() =>
      selectQuakes(parseQuakes(collection), ["--min-depth", "35km"]),
    ).toThrow("--min-depth expects a finite number, received 35km");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("treats the floor as inclusive kilometers", () => {
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, ["--min-depth", "22.4"]))).toEqual([
      "low",
      "high",
    ]);
    expect(ids(selectQuakes(parsed, ["--min-depth", "22.5"]))).toEqual(["low"]);
    expect(ids(selectQuakes(parsed, ["--min-depth", "35"]))).toEqual(["low"]);
    expect(ids(selectQuakes(parsed, ["--min-depth", "10"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(ids(selectQuakes(parsed, ["--min-depth", "35.1"]))).toEqual([]);
  });

  it("ignores a joined flag because --min-depth is its own token", () => {
    const parsed = parseQuakes(collection);

    expect(readMinDepth(["--min-depth=10"])).toBeUndefined();
    expect(ids(selectQuakes(parsed, ["--min-depth=10"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(readMinDepth(["--Min-depth", "10"])).toBeUndefined();
  });

  it("filters by min depth with max depth, place, and magnitude before sort and limit", () => {
    const parsed = parseQuakes(collection);
    const argv = [
      "--min-depth",
      "22.4",
      "--max-depth",
      "35",
      "--place",
      "place",
      "--min-magnitude",
      "5",
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
      "--min-magnitude",
      "5",
      "--place",
      "place",
      "--max-depth",
      "35",
      "--min-depth",
      "22.4",
    ];

    expect(ids(selectQuakes(parsed, argv))).toEqual(["high"]);
    expect(ids(selectQuakes(parsed, swapped))).toEqual(["high"]);
    expect(
      ids(
        selectQuakes(parsed, [
          "--min-depth",
          "10",
          "--max-depth",
          "22.4",
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
      ids(selectQuakes(parsed, ["--min-depth", "22.4", "--limit", "9"])),
    ).toEqual(["low", "high"]);
  });

  it("returns no rows when every quake is shallower than the floor", () => {
    const parsed = parseQuakes(collection);
    const selected = selectQuakes(parsed, [
      "--min-depth",
      "36",
      "--limit",
      "2",
    ]);

    expect(selected).toEqual([]);
    expect(renderQuakes(selected, "text")).toBe("");
    expect(renderQuakes(selected, "json")).toBe("[]\n");
    expect(
      ids(
        selectQuakes(parsed, ["--min-depth", "35", "--max-depth", "10"]),
      ),
    ).toEqual([]);
  });

  it("prints the depth-filtered list as text and json and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const argv = ["--min-depth", "35", "--format", "text"];
    const selected = selectQuakes(parseQuakes(collection), argv);
    const jsonArgv = [
      "--min-depth",
      "22.4",
      "--place",
      "high",
      "--format",
      "json",
    ];
    const jsonSelected = selectQuakes(parseQuakes(collection), jsonArgv);

    expect(ids(selected)).toEqual(["low"]);
    expect(renderQuakes(selected, readFormat(argv))).toBe(
      "M 4.7  35 km  low place  2024-03-09T16:00:00.000Z\n",
    );
    expect(readFormat(jsonArgv)).toBe("json");
    expect(ids(jsonSelected)).toEqual(["high"]);
    expect(renderQuakes(jsonSelected, "json")).toBe(
      `${JSON.stringify(jsonSelected, null, 2)}\n`,
    );
    expect(jsonSelected[0]?.time).toBe(1710000000000);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("accepts a finite decimal, sign, or exponent as kilometers", () => {
    const parsed = parseQuakes(collection);

    expect(readMinDepth(["--min-depth", "2.24e1"])).toBe(22.4);
    expect(ids(selectQuakes(parsed, ["--min-depth", "2.24e1"]))).toEqual([
      "low",
      "high",
    ]);
    expect(readMinDepth(["--min-depth", "+22.4"])).toBe(22.4);
    expect(ids(selectQuakes(parsed, ["--min-depth", "+22.4"]))).toEqual([
      "low",
      "high",
    ]);
    expect(ids(selectQuakes(parsed, ["--min-depth", "35.0"]))).toEqual(["low"]);
    expect(ids(selectQuakes(parsed, ["--min-depth", "1e1"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
  });

  it("keeps the positive depths when the floor is zero or negative", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const parsed = parseQuakes(collection);

    expect(readMinDepth(["--min-depth", "0"])).toBe(0);
    expect(ids(selectQuakes(parsed, ["--min-depth", "0"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(readMinDepth(["--min-depth", "-1"])).toBe(-1);
    expect(ids(selectQuakes(parsed, ["--min-depth", "-1"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
