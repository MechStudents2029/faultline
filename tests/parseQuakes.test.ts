import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseQuakes } from "../src/parseQuakes.js";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/significant_day.sample.geojson",
);

function loadFixture(): unknown {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
}

describe("parseQuakes", () => {
  it("reads the checked-in significant-day fixture from disk", () => {
    const quakes = parseQuakes(loadFixture());

    expect(quakes).toEqual([
      {
        id: "us1000sample1",
        magnitude: 6.2,
        place: "45 km SW of Copiapo, Chile",
        time: 1710000000000,
        longitude: -71.2,
        latitude: -27.4,
        depthKm: 35,
      },
      {
        id: "us1000sample2",
        magnitude: 4.7,
        place: "5 km NNE of Korumburra, Australia",
        time: 1710007200000,
        longitude: 145.8401,
        latitude: -38.3802,
        depthKm: 10,
      },
      {
        id: "us1000sample3",
        magnitude: 5.1,
        place: "120 km ESE of Hachijo-jima, Japan",
        time: 1710010800000,
        longitude: 140.9,
        latitude: 32.6,
        depthKm: 22.4,
      },
    ]);
  });

  it("keeps USGS epoch milliseconds on time", () => {
    const [first] = parseQuakes(loadFixture());

    expect(first?.time).toBe(1710000000000);
    expect(new Date(first?.time ?? 0).toISOString()).toBe("2024-03-09T16:00:00.000Z");
  });

  it("rejects a payload that is not a FeatureCollection", () => {
    expect(() => parseQuakes({ type: "Feature", id: "x" })).toThrow(
      TypeError,
    );
  });

  it("rejects a feature with missing or malformed geometry", () => {
    const properties = {
      mag: 5,
      place: "somewhere",
      time: 1710000000000,
    };

    expect(() =>
      parseQuakes({
        type: "FeatureCollection",
        features: [{ type: "Feature", id: "us1000bad", properties }],
      }),
    ).toThrow(TypeError);

    expect(() =>
      parseQuakes({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "us1000bad",
            properties,
            geometry: { type: "LineString", coordinates: [] },
          },
        ],
      }),
    ).toThrow(TypeError);

    expect(() =>
      parseQuakes({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "us1000bad",
            properties,
            geometry: { type: "Point", coordinates: [-71.2, -27.4] },
          },
        ],
      }),
    ).toThrow(TypeError);

    expect(() =>
      parseQuakes({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "us1000bad",
            properties,
            geometry: { type: "Point", coordinates: [-71.2, -27.4, "35"] },
          },
        ],
      }),
    ).toThrow(TypeError);
  });
});
