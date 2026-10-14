import { describe, expect, it, vi } from "vitest";
import { readFormat, renderQuakes } from "../src/formatQuakes.js";
import { parseQuakes, type Quake } from "../src/parseQuakes.js";
import { readMaxMagnitude, selectQuakes } from "../src/selectQuakes.js";

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

describe("max magnitude filter", () => {
  it("keeps quakes at or below the ceiling and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, ["--max-magnitude", "5"]))).toEqual([
      "low",
      "edge",
    ]);
    expect(ids(parsed)).toEqual(["low", "edge", "high"]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps every magnitude when --max-magnitude is omitted", () => {
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, []))).toEqual(["low", "edge", "high"]);
    expect(readMaxMagnitude([])).toBeUndefined();
  });

  it("rejects a missing or non-numeric --max-magnitude value and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect(() => readMaxMagnitude(["--max-magnitude"])).toThrow(TypeError);
    expect(() => readMaxMagnitude(["--max-magnitude"])).toThrow(
      "--max-magnitude requires a number",
    );
    expect(() => readMaxMagnitude(["--max-magnitude", "big"])).toThrow(
      TypeError,
    );
    expect(() => readMaxMagnitude(["--max-magnitude", "big"])).toThrow(
      "--max-magnitude expects a finite number, received big",
    );
    expect(() =>
      selectQuakes(parseQuakes(collection), ["--max-magnitude", "6.2m"]),
    ).toThrow("--max-magnitude expects a finite number, received 6.2m");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("treats the ceiling as inclusive", () => {
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, ["--max-magnitude", "5"]))).toEqual([
      "low",
      "edge",
    ]);
    expect(ids(selectQuakes(parsed, ["--max-magnitude", "4.9"]))).toEqual([
      "low",
    ]);
    expect(ids(selectQuakes(parsed, ["--max-magnitude", "4.7"]))).toEqual([
      "low",
    ]);
    expect(ids(selectQuakes(parsed, ["--max-magnitude", "6.2"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(ids(selectQuakes(parsed, ["--max-magnitude", "4.6"]))).toEqual([]);
  });

  it("ignores a joined flag because --max-magnitude is its own token", () => {
    const parsed = parseQuakes(collection);

    expect(readMaxMagnitude(["--max-magnitude=5"])).toBeUndefined();
    expect(ids(selectQuakes(parsed, ["--max-magnitude=5"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(readMaxMagnitude(["--Max-magnitude", "5"])).toBeUndefined();
  });

  it("filters by max magnitude with the other filters before sort and limit", () => {
    const parsed = parseQuakes(collection);
    const argv = [
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
    ];

    expect(ids(selectQuakes(parsed, argv))).toEqual(["edge"]);
    expect(ids(selectQuakes(parsed, swapped))).toEqual(["edge"]);
    expect(ids(parsed)).toEqual(["low", "edge", "high"]);
    expect(
      ids(
        selectQuakes(parsed, [
          "--max-magnitude",
          "6.2",
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
      ids(selectQuakes(parsed, ["--max-magnitude", "5", "--limit", "9"])),
    ).toEqual(["low", "edge"]);
  });

  it("returns no rows when every quake is larger than the ceiling", () => {
    const parsed = parseQuakes(collection);
    const selected = selectQuakes(parsed, [
      "--max-magnitude",
      "4",
      "--limit",
      "2",
    ]);

    expect(selected).toEqual([]);
    expect(renderQuakes(selected, "text")).toBe("");
    expect(renderQuakes(selected, "json")).toBe("[]\n");
    expect(
      ids(
        selectQuakes(parsed, ["--min-magnitude", "6", "--max-magnitude", "5"]),
      ),
    ).toEqual([]);
  });

  it("prints the magnitude-filtered list as text and json and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const argv = ["--max-magnitude", "4.7", "--format", "text"];
    const selected = selectQuakes(parseQuakes(collection), argv);
    const jsonArgv = [
      "--max-magnitude",
      "5",
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
        "M 4.7  35 km  low place  2024-03-09T16:00:00.000Z",
        "1 quake",
      ].join("\n") + "\n",
    );
    expect(readFormat(jsonArgv)).toBe("json");
    expect(ids(jsonSelected)).toEqual(["edge"]);
    expect(renderQuakes(jsonSelected, "json")).toBe(
      `${JSON.stringify(jsonSelected, null, 2)}\n`,
    );
    expect(jsonSelected[0]?.time).toBe(1710000000000);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("accepts a finite decimal, sign, or exponent as a magnitude", () => {
    const parsed = parseQuakes(collection);

    expect(readMaxMagnitude(["--max-magnitude", "5e0"])).toBe(5);
    expect(ids(selectQuakes(parsed, ["--max-magnitude", "5e0"]))).toEqual([
      "low",
      "edge",
    ]);
    expect(readMaxMagnitude(["--max-magnitude", "+5"])).toBe(5);
    expect(ids(selectQuakes(parsed, ["--max-magnitude", "+5"]))).toEqual([
      "low",
      "edge",
    ]);
    expect(ids(selectQuakes(parsed, ["--max-magnitude", "6.20"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(ids(selectQuakes(parsed, ["--max-magnitude", "4.70"]))).toEqual([
      "low",
    ]);
  });

  it("keeps none of the positive magnitudes when the ceiling is zero or negative", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const parsed = parseQuakes(collection);

    expect(readMaxMagnitude(["--max-magnitude", "0"])).toBe(0);
    expect(ids(selectQuakes(parsed, ["--max-magnitude", "0"]))).toEqual([]);
    expect(readMaxMagnitude(["--max-magnitude", "-1"])).toBe(-1);
    expect(ids(selectQuakes(parsed, ["--max-magnitude", "-1"]))).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
