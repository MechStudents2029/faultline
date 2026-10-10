import { describe, expect, it, vi } from "vitest";
import { readFormat, renderQuakes } from "../src/formatQuakes.js";
import { parseQuakes, type Quake } from "../src/parseQuakes.js";
import { readMaxDepth, selectQuakes } from "../src/selectQuakes.js";

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

describe("max depth filter", () => {
  it("keeps quakes no deeper than the cutoff and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, ["--max-depth", "22.4"]))).toEqual([
      "edge",
      "high",
    ]);
    expect(ids(parsed)).toEqual(["low", "edge", "high"]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps every depth when --max-depth is omitted", () => {
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, []))).toEqual(["low", "edge", "high"]);
    expect(readMaxDepth([])).toBeUndefined();
  });

  it("rejects a missing or non-numeric --max-depth value and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect(() => readMaxDepth(["--max-depth"])).toThrow(TypeError);
    expect(() => readMaxDepth(["--max-depth"])).toThrow(
      "--max-depth requires a number",
    );
    expect(() => readMaxDepth(["--max-depth", "deep"])).toThrow(TypeError);
    expect(() => readMaxDepth(["--max-depth", "deep"])).toThrow(
      "--max-depth expects a finite number, received deep",
    );
    expect(() =>
      selectQuakes(parseQuakes(collection), ["--max-depth", "35km"]),
    ).toThrow("--max-depth expects a finite number, received 35km");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("treats the cutoff as inclusive kilometers", () => {
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, ["--max-depth", "22.4"]))).toEqual([
      "edge",
      "high",
    ]);
    expect(ids(selectQuakes(parsed, ["--max-depth", "22.3"]))).toEqual([
      "edge",
    ]);
    expect(ids(selectQuakes(parsed, ["--max-depth", "10"]))).toEqual(["edge"]);
    expect(ids(selectQuakes(parsed, ["--max-depth", "35"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(ids(selectQuakes(parsed, ["--max-depth", "9.9"]))).toEqual([]);
  });

  it("ignores a joined flag because --max-depth is its own token", () => {
    const parsed = parseQuakes(collection);

    expect(readMaxDepth(["--max-depth=10"])).toBeUndefined();
    expect(ids(selectQuakes(parsed, ["--max-depth=10"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(readMaxDepth(["--Max-depth", "10"])).toBeUndefined();
  });

  it("filters by depth with place and magnitude before sort and limit", () => {
    const parsed = parseQuakes(collection);
    const argv = [
      "--max-depth",
      "22.4",
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
      "22.4",
    ];

    expect(ids(selectQuakes(parsed, argv))).toEqual(["high"]);
    expect(ids(selectQuakes(parsed, swapped))).toEqual(["high"]);
    expect(
      ids(
        selectQuakes(parsed, [
          "--max-depth",
          "35",
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
      ids(selectQuakes(parsed, ["--max-depth", "22.4", "--limit", "9"])),
    ).toEqual(["edge", "high"]);
  });

  it("returns no rows when every quake is deeper than the cutoff", () => {
    const parsed = parseQuakes(collection);
    const selected = selectQuakes(parsed, ["--max-depth", "9", "--limit", "2"]);

    expect(selected).toEqual([]);
    expect(renderQuakes(selected, "text")).toBe("");
    expect(renderQuakes(selected, "json")).toBe("[]\n");
  });

  it("prints the depth-filtered list as text and json and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const argv = ["--max-depth", "10", "--format", "text"];
    const selected = selectQuakes(parseQuakes(collection), argv);
    const jsonArgv = ["--max-depth", "22.4", "--place", "high", "--format", "json"];
    const jsonSelected = selectQuakes(parseQuakes(collection), jsonArgv);

    expect(ids(selected)).toEqual(["edge"]);
    expect(renderQuakes(selected, readFormat(argv))).toBe(
      "M 5  10 km  edge place  2024-03-09T16:00:00.000Z\n",
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

    expect(readMaxDepth(["--max-depth", "1e1"])).toBe(10);
    expect(ids(selectQuakes(parsed, ["--max-depth", "1e1"]))).toEqual(["edge"]);
    expect(readMaxDepth(["--max-depth", "+22.4"])).toBe(22.4);
    expect(ids(selectQuakes(parsed, ["--max-depth", "+22.4"]))).toEqual([
      "edge",
      "high",
    ]);
    expect(ids(selectQuakes(parsed, ["--max-depth", "35.0"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
  });

  it("keeps none of the positive depths when the cutoff is zero or negative", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const parsed = parseQuakes(collection);

    expect(readMaxDepth(["--max-depth", "0"])).toBe(0);
    expect(ids(selectQuakes(parsed, ["--max-depth", "0"]))).toEqual([]);
    expect(readMaxDepth(["--max-depth", "-1"])).toBe(-1);
    expect(ids(selectQuakes(parsed, ["--max-depth", "-1"]))).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
