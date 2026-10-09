import { describe, expect, it, vi } from "vitest";
import { readFormat, renderQuakes } from "../src/formatQuakes.js";
import { parseQuakes, type Quake } from "../src/parseQuakes.js";
import { readPlace, selectQuakes } from "../src/selectQuakes.js";

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

describe("place filter", () => {
  it("keeps quakes whose place contains the text and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, ["--place", "high"]))).toEqual(["high"]);
    expect(ids(parsed)).toEqual(["low", "edge", "high"]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps every place when --place is omitted", () => {
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, []))).toEqual(["low", "edge", "high"]);
    expect(readPlace([])).toBeUndefined();
  });

  it("rejects a missing --place value and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect(() => readPlace(["--place"])).toThrow(TypeError);
    expect(() => readPlace(["--place"])).toThrow("--place requires text");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("matches place as a case-sensitive substring", () => {
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, ["--place", "place"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(ids(selectQuakes(parsed, ["--place", "Place"]))).toEqual([]);
    expect(ids(selectQuakes(parsed, ["--place", "High"]))).toEqual([]);
    expect(ids(selectQuakes(parsed, ["--place", "edge"]))).toEqual(["edge"]);
  });

  it("treats an empty string as text that matches every place", () => {
    const parsed = parseQuakes(collection);

    expect(readPlace(["--place", ""])).toBe("");
    expect(ids(selectQuakes(parsed, ["--place", ""]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
  });

  it("treats spaces as literal text", () => {
    const parsed = parseQuakes(collection);

    expect(ids(selectQuakes(parsed, ["--place", " "]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(ids(selectQuakes(parsed, ["--place", "  "]))).toEqual([]);
    expect(ids(selectQuakes(parsed, ["--place", "high place"]))).toEqual([
      "high",
    ]);
  });

  it("ignores a joined flag because --place is its own token", () => {
    const parsed = parseQuakes(collection);

    expect(readPlace(["--place=high"])).toBeUndefined();
    expect(ids(selectQuakes(parsed, ["--place=high"]))).toEqual([
      "low",
      "edge",
      "high",
    ]);
    expect(readPlace(["--Place", "high"])).toBeUndefined();
  });

  it("filters by place and magnitude before sort and limit", () => {
    const parsed = parseQuakes(collection);
    const argv = [
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
    ];

    expect(ids(selectQuakes(parsed, argv))).toEqual(["high"]);
    expect(ids(selectQuakes(parsed, swapped))).toEqual(["high"]);
    expect(
      ids(
        selectQuakes(parsed, [
          "--place",
          "edge",
          "--sort",
          "magnitude",
          "--limit",
          "2",
        ]),
      ),
    ).toEqual(["edge"]);
  });

  it("returns no rows when the place matches nothing", () => {
    const parsed = parseQuakes(collection);
    const selected = selectQuakes(parsed, ["--place", "Chile", "--limit", "2"]);

    expect(selected).toEqual([]);
    expect(renderQuakes(selected, "text")).toBe("");
    expect(renderQuakes(selected, "json")).toBe("[]\n");
  });

  it("prints the place-filtered list as text and json and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const argv = ["--place", "high", "--format", "text"];
    const selected = selectQuakes(parseQuakes(collection), argv);
    const jsonArgv = ["--place", "edge", "--format", "json"];
    const jsonSelected = selectQuakes(parseQuakes(collection), jsonArgv);

    expect(ids(selected)).toEqual(["high"]);
    expect(renderQuakes(selected, readFormat(argv))).toBe(
      "M 6.2  22.4 km  high place  2024-03-09T16:00:00.000Z\n",
    );
    expect(readFormat(jsonArgv)).toBe("json");
    expect(ids(jsonSelected)).toEqual(["edge"]);
    expect(renderQuakes(jsonSelected, "json")).toBe(
      `${JSON.stringify(jsonSelected, null, 2)}\n`,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
