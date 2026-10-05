import { describe, expect, it, vi } from "vitest";
import { parseQuakes } from "../src/parseQuakes.js";
import { readMinMagnitude, selectQuakes } from "../src/selectQuakes.js";

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

describe("selectQuakes", () => {
  it("filters an in-memory FeatureCollection and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const parsed = parseQuakes(collection);

    expect(parsed.map((quake) => quake.id)).toEqual(["low", "edge", "high"]);

    const selected = selectQuakes(parsed, ["--min-magnitude", "5"]);

    expect(selected).toEqual([
      {
        id: "edge",
        magnitude: 5,
        place: "edge place",
        time: 1710000000000,
        longitude: 145.8401,
        latitude: -38.3802,
        depthKm: 10,
      },
      {
        id: "high",
        magnitude: 6.2,
        place: "high place",
        time: 1710000000000,
        longitude: 140.9,
        latitude: 32.6,
        depthKm: 22.4,
      },
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("returns every parsed quake when --min-magnitude is omitted", () => {
    const parsed = parseQuakes(collection);

    expect(selectQuakes(parsed, [])).toEqual(parsed);
  });

  it("rejects a missing or non-numeric --min-magnitude value", () => {
    expect(() => readMinMagnitude(["--min-magnitude"])).toThrow(TypeError);
    expect(() => readMinMagnitude(["--min-magnitude", "big"])).toThrow(
      TypeError,
    );
  });
});
