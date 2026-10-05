export interface Quake {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  longitude: number;
  latitude: number;
  depthKm: number;
}

/**
 * Map a USGS earthquake GeoJSON FeatureCollection to quake records.
 * `time` is the USGS epoch milliseconds value from `properties.time`.
 * `longitude`, `latitude`, and `depthKm` come from a Point's
 * `geometry.coordinates` in the order `[longitude, latitude, depth in km]`.
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

  const { longitude, latitude, depthKm } = readPoint(feature.geometry, id);

  return { id, magnitude, place, time, longitude, latitude, depthKm };
}

function readPoint(
  geometry: unknown,
  id: string,
): { longitude: number; latitude: number; depthKm: number } {
  if (!isRecord(geometry)) {
    throw new TypeError(`Feature ${id} is missing geometry`);
  }

  if (geometry.type !== "Point") {
    throw new TypeError(`Feature ${id} geometry is not a Point`);
  }

  const coordinates = geometry.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 3) {
    throw new TypeError(
      `Feature ${id} geometry coordinates must be [longitude, latitude, depth]`,
    );
  }

  const [longitude, latitude, depthKm] = coordinates;
  if (!isFiniteNumber(longitude)) {
    throw new TypeError(`Feature ${id} is missing a finite longitude`);
  }

  if (!isFiniteNumber(latitude)) {
    throw new TypeError(`Feature ${id} is missing a finite latitude`);
  }

  if (!isFiniteNumber(depthKm)) {
    throw new TypeError(`Feature ${id} is missing a finite depth`);
  }

  return { longitude, latitude, depthKm };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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
