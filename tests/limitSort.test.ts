import { describe, expect, it, vi } from "vitest";
import { readFormat, renderQuakes } from "../src/formatQuakes.js";
import { parseQuakes, type Quake } from "../src/parseQuakes.js";
import { readLimit, readSort, selectQuakes } from "../src/selectQuakes.js";

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

describe("limit and sort", () => {
  it("keeps the first N quakes in feed order and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, ["--limit", "2"]))).toEqual([
      "low",
      "edge",
    ]);
    expect(ids(parsed)).toEqual(["low", "edge", "high"]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps the whole list when --limit is omitted", () => {
    const parsed = parseQuakes(collection);

    expect(selectQuakes(parsed, [])).toEqual(parsed);
    expect(readLimit([])).toBeUndefined();
  });

  it("applies --limit after --min-magnitude, still in feed order", () => {
    const parsed = parseQuakes(collection);

    expect(
      ids(selectQuakes(parsed, ["--min-magnitude", "5", "--limit", "1"])),
    ).toEqual(["edge"]);
  });

  it("rejects a missing, zero, negative, or non-integer --limit", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect(() => readLimit(["--limit"])).toThrow(TypeError);
    expect(() => readLimit(["--limit"])).toThrow(
      "--limit requires a positive integer",
    );
    expect(() => readLimit(["--limit", "0"])).toThrow(
      "--limit expects a positive integer, received 0",
    );
    expect(() => readLimit(["--limit", "-1"])).toThrow(
      "--limit expects a positive integer, received -1",
    );
    expect(() => readLimit(["--limit", "1.5"])).toThrow(
      "--limit expects a positive integer, received 1.5",
    );
    expect(() => readLimit(["--limit", "2.0"])).toThrow(
      "--limit expects a positive integer, received 2.0",
    );
    expect(() => readLimit(["--limit", "+3"])).toThrow(
      "--limit expects a positive integer, received +3",
    );
    expect(() => readLimit(["--limit", "01"])).toThrow(
      "--limit expects a positive integer, received 01",
    );
    expect(() => readLimit(["--limit", "big"])).toThrow(
      "--limit expects a positive integer, received big",
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("orders by magnitude descending and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, ["--sort", "magnitude"]))).toEqual([
      "high",
      "edge",
      "low",
    ]);
    expect(ids(parsed)).toEqual(["low", "edge", "high"]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps feed order when --sort is omitted", () => {
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, []))).toEqual(["low", "edge", "high"]);
    expect(readSort([])).toBeUndefined();
  });

  it("rejects a missing or unknown --sort value", () => {
    expect(() => readSort(["--sort"])).toThrow(TypeError);
    expect(() => readSort(["--sort"])).toThrow("--sort requires magnitude");
    expect(() => readSort(["--sort", "time"])).toThrow(
      "--sort expects magnitude, received time",
    );
    expect(() => readSort(["--sort", "MAGNITUDE"])).toThrow(
      "--sort expects magnitude, received MAGNITUDE",
    );
  });

  it("sorts before the limit so the largest N remain", () => {
    const parsed = parseQuakes(collection);
    const descending = ["--sort", "magnitude", "--limit", "2"];
    const swapped = ["--limit", "2", "--sort", "magnitude"];

    expect(ids(selectQuakes(parsed, descending))).toEqual(["high", "edge"]);
    expect(ids(selectQuakes(parsed, swapped))).toEqual(["high", "edge"]);
  });

  it("keeps equal magnitudes in feed order", () => {
    const tied = {
      type: "FeatureCollection",
      features: [
        feature("first", 5, [-71.2, -27.4, 35]),
        feature("second", 5, [145.8401, -38.3802, 10]),
        feature("largest", 6.2, [140.9, 32.6, 22.4]),
      ],
    };

    expect(ids(selectQuakes(parseQuakes(tied), ["--sort", "magnitude"]))).toEqual(
      ["largest", "first", "second"],
    );
  });

  it("returns every selected quake when --limit exceeds the list", () => {
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, ["--limit", "9"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
  });

  it("prints the same limited sort as JSON and text and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const argv = [
      "--min-magnitude",
      "5",
      "--sort",
      "magnitude",
      "--limit",
      "2",
      "--format",
      "text",
    ];
    const selected = selectQuakes(parseQuakes(collection), argv);
    const text = renderQuakes(selected, readFormat(argv));
    const jsonArgv = ["--sort", "magnitude", "--limit", "1", "--format", "json"];
    const jsonSelected = selectQuakes(parseQuakes(collection), jsonArgv);

    expect(ids(selected)).toEqual(["high", "edge"]);
    expect(text).toBe(
      [
        "M 6.2  22.4 km  high place  2024-03-09T16:00:00.000Z",
        "M 5  10 km  edge place  2024-03-09T16:00:00.000Z",
      ].join("\n") + "\n",
    );
    expect(text).not.toContain("low place");
    expect(readFormat(jsonArgv)).toBe("json");
    expect(ids(jsonSelected)).toEqual(["high"]);
    expect(renderQuakes(jsonSelected, "json")).toBe(
      `${JSON.stringify(jsonSelected, null, 2)}\n`,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
