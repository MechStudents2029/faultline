export interface Quake {
  id: string;
  magnitude: number;
  place: string;
  time: number;
}

/**
 * Map a USGS earthquake GeoJSON FeatureCollection to quake records.
 * `time` is the USGS epoch milliseconds value from `properties.time`.
 * Does not fetch the network.
 */
export function parseQuakes(geojson: unknown): Quake[] {
  if (!isFeatureCollection(geojson)) {
    throw new TypeError("Expected a GeoJSON FeatureCollection");
  }

  return geojson.features.map((feature, index) => parseFeature(feature, index));
}

function parseFeature(feature: unknown, index: number): Quake {
  if (!isRecord(feature) || feature.type !== "Feature") {
    throw new TypeError(`Feature at index ${index} is not a GeoJSON Feature`);
  }

  const id = feature.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new TypeError(`Feature at index ${index} is missing a string id`);
  }

  const properties = feature.properties;
  if (!isRecord(properties)) {
    throw new TypeError(`Feature ${id} is missing properties`);
  }

  const magnitude = properties.mag;
  if (typeof magnitude !== "number" || !Number.isFinite(magnitude)) {
    throw new TypeError(`Feature ${id} is missing a finite magnitude`);
  }

  const place = properties.place;
  if (typeof place !== "string" || place.length === 0) {
    throw new TypeError(`Feature ${id} is missing a place`);
  }

  const time = properties.time;
  if (typeof time !== "number" || !Number.isFinite(time)) {
    throw new TypeError(`Feature ${id} is missing a finite time`);
  }

  return { id, magnitude, place, time };
}

function isFeatureCollection(
  value: unknown,
): value is { type: "FeatureCollection"; features: unknown[] } {
  return (
    isRecord(value) &&
    value.type === "FeatureCollection" &&
    Array.isArray(value.features)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
