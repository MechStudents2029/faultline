import { describe, expect, it, vi } from "vitest";
import { readFormat, renderQuakes } from "../src/formatQuakes.js";
import { parseQuakes } from "../src/parseQuakes.js";
import { selectQuakes } from "../src/selectQuakes.js";

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

const chileQuake = {
  id: "us1000sample1",
  magnitude: 6.2,
  place: "45 km SW of Copiapo, Chile",
  time: 1710000000000,
  longitude: -71.2,
  latitude: -27.4,
  depthKm: 35,
};

describe("formatQuakes", () => {
  it("prints the week-plan text line and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect(renderQuakes([chileQuake], "text")).toBe(
      "M 6.2  35 km  45 km SW of Copiapo, Chile  2024-03-09T16:00:00.000Z\n",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("prints one line per in-memory quake without longitude or latitude", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const text = renderQuakes(parseQuakes(collection), "text");

    expect(text).toBe(
      [
        "M 4.7  35 km  low place  2024-03-09T16:00:00.000Z",
        "M 5  10 km  edge place  2024-03-09T16:00:00.000Z",
        "M 6.2  22.4 km  high place  2024-03-09T16:00:00.000Z",
      ].join("\n") + "\n",
    );
    expect(text).not.toContain("-71.2");
    expect(text).not.toContain("145.8401");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps two-space JSON when --format is omitted or json", () => {
    const quakes = parseQuakes(collection);
    const json = `${JSON.stringify(quakes, null, 2)}\n`;

    expect(readFormat([])).toBe("json");
    expect(readFormat(["--format", "json"])).toBe("json");
    expect(renderQuakes(quakes, readFormat([]))).toBe(json);
    expect(renderQuakes(quakes, readFormat(["--format", "json"]))).toBe(json);
    expect(renderQuakes([], "text")).toBe("");
  });

  it("composes --format text with --min-magnitude and does not call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const argv = ["--min-magnitude", "5", "--format", "text"];
    const text = renderQuakes(
      selectQuakes(parseQuakes(collection), argv),
      readFormat(argv),
    );

    expect(text).toBe(
      [
        "M 5  10 km  edge place  2024-03-09T16:00:00.000Z",
        "M 6.2  22.4 km  high place  2024-03-09T16:00:00.000Z",
      ].join("\n") + "\n",
    );
    expect(text).not.toContain("low place");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("rejects a missing or unknown --format value", () => {
    expect(() => readFormat(["--format"])).toThrow(TypeError);
    expect(() => readFormat(["--format"])).toThrow(
      "--format requires json or text",
    );
    expect(() => readFormat(["--format", "csv"])).toThrow(TypeError);
    expect(() => readFormat(["--format", "csv"])).toThrow(
      "--format expects json or text, received csv",
    );
  });
});
