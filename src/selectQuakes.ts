import type { Quake } from "./parseQuakes.js";

const MIN_MAGNITUDE_FLAG = "--min-magnitude";
const MAX_MAGNITUDE_FLAG = "--max-magnitude";
const PLACE_FLAG = "--place";
const MAX_DEPTH_FLAG = "--max-depth";
const MIN_DEPTH_FLAG = "--min-depth";
const MIN_TIME_FLAG = "--min-time";
const MAX_TIME_FLAG = "--max-time";
const LIMIT_FLAG = "--limit";
const SORT_FLAG = "--sort";

export type QuakeSort = "magnitude" | "time";

/**
 * Read `--min-magnitude <number>` from CLI args.
 * Returns undefined when the flag is omitted.
 */
export function readMinMagnitude(argv: readonly string[]): number | undefined {
  const index = argv.indexOf(MIN_MAGNITUDE_FLAG);
  if (index === -1) {
    return undefined;
  }

  const raw = argv[index + 1];
  if (raw === undefined) {
    throw new TypeError("--min-magnitude requires a number");
  }

  if (!isFiniteNumberToken(raw)) {
    throw new TypeError(
      `--min-magnitude expects a finite number, received ${raw}`,
    );
  }

  return Number(raw);
}

/**
 * Read `--max-magnitude <number>` from CLI args.
 * Returns undefined when the flag is omitted, which keeps every magnitude.
 * A missing or non-numeric value throws `TypeError`.
 */
export function readMaxMagnitude(argv: readonly string[]): number | undefined {
  const index = argv.indexOf(MAX_MAGNITUDE_FLAG);
  if (index === -1) {
    return undefined;
  }

  const raw = argv[index + 1];
  if (raw === undefined) {
    throw new TypeError("--max-magnitude requires a number");
  }

  if (!isFiniteNumberToken(raw)) {
    throw new TypeError(
      `--max-magnitude expects a finite number, received ${raw}`,
    );
  }

  return Number(raw);
}

/**
 * Read `--limit <count>` from CLI args.
 * Returns undefined when the flag is omitted.
 * A missing, zero, negative, or non-integer value throws `TypeError`.
 */
export function readLimit(argv: readonly string[]): number | undefined {
  const index = argv.indexOf(LIMIT_FLAG);
  if (index === -1) {
    return undefined;
  }

  const raw = argv[index + 1];
  if (raw === undefined) {
    throw new TypeError("--limit requires a positive integer");
  }

  if (!isPositiveIntegerToken(raw)) {
    throw new TypeError(`--limit expects a positive integer, received ${raw}`);
  }

  return Number(raw);
}

/**
 * Read `--max-depth <km>` from CLI args.
 * Returns undefined when the flag is omitted, which keeps every depth.
 * A missing or non-numeric value throws `TypeError`.
 */
export function readMaxDepth(argv: readonly string[]): number | undefined {
  const index = argv.indexOf(MAX_DEPTH_FLAG);
  if (index === -1) {
    return undefined;
  }

  const raw = argv[index + 1];
  if (raw === undefined) {
    throw new TypeError("--max-depth requires a number");
  }

  if (!isFiniteNumberToken(raw)) {
    throw new TypeError(
      `--max-depth expects a finite number, received ${raw}`,
    );
  }

  return Number(raw);
}

/**
 * Read `--min-time <epoch-ms>` from CLI args.
 * Returns undefined when the flag is omitted, which keeps every time.
 * A missing or non-numeric value throws `TypeError`.
 */
export function readMinTime(argv: readonly string[]): number | undefined {
  const index = argv.indexOf(MIN_TIME_FLAG);
  if (index === -1) {
    return undefined;
  }

  const raw = argv[index + 1];
  if (raw === undefined) {
    throw new TypeError("--min-time requires a number");
  }

  if (!isFiniteNumberToken(raw)) {
    throw new TypeError(
      `--min-time expects a finite number, received ${raw}`,
    );
  }

  return Number(raw);
}

/**
 * Read `--max-time <epoch-ms>` from CLI args.
 * Returns undefined when the flag is omitted, which keeps every time.
 * A missing or non-numeric value throws `TypeError`.
 */
export function readMaxTime(argv: readonly string[]): number | undefined {
  const index = argv.indexOf(MAX_TIME_FLAG);
  if (index === -1) {
    return undefined;
  }

  const raw = argv[index + 1];
  if (raw === undefined) {
    throw new TypeError("--max-time requires a number");
  }

  if (!isFiniteNumberToken(raw)) {
    throw new TypeError(
      `--max-time expects a finite number, received ${raw}`,
    );
  }

  return Number(raw);
}

/**
 * Read `--min-depth <km>` from CLI args.
 * Returns undefined when the flag is omitted, which keeps every depth.
 * A missing or non-numeric value throws `TypeError`.
 */
export function readMinDepth(argv: readonly string[]): number | undefined {
  const index = argv.indexOf(MIN_DEPTH_FLAG);
  if (index === -1) {
    return undefined;
  }

  const raw = argv[index + 1];
  if (raw === undefined) {
    throw new TypeError("--min-depth requires a number");
  }

  if (!isFiniteNumberToken(raw)) {
    throw new TypeError(
      `--min-depth expects a finite number, received ${raw}`,
    );
  }

  return Number(raw);
}

/**
 * Read `--place <text>` from CLI args.
 * Returns undefined when the flag is omitted, which keeps every place.
 * A missing value throws `TypeError`.
 */
export function readPlace(argv: readonly string[]): string | undefined {
  const index = argv.indexOf(PLACE_FLAG);
  if (index === -1) {
    return undefined;
  }

  const raw = argv[index + 1];
  if (raw === undefined) {
    throw new TypeError("--place requires text");
  }

  return raw;
}

/**
 * Read `--sort magnitude` or `--sort time` from CLI args.
 * Returns undefined when the flag is omitted, which keeps feed order.
 * A missing value, or any token other than `magnitude` or `time`,
 * throws `TypeError`.
 */
export function readSort(argv: readonly string[]): QuakeSort | undefined {
  const index = argv.indexOf(SORT_FLAG);
  if (index === -1) {
    return undefined;
  }

  const raw = argv[index + 1];
  if (raw === undefined) {
    throw new TypeError("--sort requires magnitude or time");
  }

  if (!isQuakeSort(raw)) {
    throw new TypeError(`--sort expects magnitude or time, received ${raw}`);
  }

  return raw;
}

/**
 * CLI selection on a `parseQuakes` result.
 * Drops quakes below `--min-magnitude`, quakes above `--max-magnitude`,
 * quakes whose `place` does not contain `--place`, quakes deeper than
 * `--max-depth`, quakes shallower than `--min-depth`, quakes earlier
 * than `--min-time`, and quakes later than `--max-time`, optionally
 * orders by magnitude descending or by time ascending, then keeps
 * the first `--limit` rows.
 * Omitted flags keep the whole list in feed order.
 */
export function selectQuakes(
  quakes: readonly Quake[],
  argv: readonly string[],
): Quake[] {
  const minMagnitude = readMinMagnitude(argv);
  const maxMagnitude = readMaxMagnitude(argv);
  const place = readPlace(argv);
  const maxDepth = readMaxDepth(argv);
  const minDepth = readMinDepth(argv);
  const minTime = readMinTime(argv);
  const maxTime = readMaxTime(argv);
  const limit = readLimit(argv);
  const sort = readSort(argv);

  const byMinMagnitude =
    minMagnitude === undefined
      ? [...quakes]
      : quakes.filter((quake) => quake.magnitude >= minMagnitude);

  const byMagnitude =
    maxMagnitude === undefined
      ? byMinMagnitude
      : byMinMagnitude.filter((quake) => quake.magnitude <= maxMagnitude);

  const byPlace =
    place === undefined
      ? byMagnitude
      : byMagnitude.filter((quake) => quake.place.includes(place));

  const byMaxDepth =
    maxDepth === undefined
      ? byPlace
      : byPlace.filter((quake) => quake.depthKm <= maxDepth);

  const byMinDepth =
    minDepth === undefined
      ? byMaxDepth
      : byMaxDepth.filter((quake) => quake.depthKm >= minDepth);

  const byMinTime =
    minTime === undefined
      ? byMinDepth
      : byMinDepth.filter((quake) => quake.time >= minTime);

  const selected =
    maxTime === undefined
      ? byMinTime
      : byMinTime.filter((quake) => quake.time <= maxTime);

  if (sort === "magnitude") {
    selected.sort((left, right) => right.magnitude - left.magnitude);
  } else if (sort === "time") {
    selected.sort((left, right) => left.time - right.time);
  }

  if (limit === undefined) {
    return selected;
  }

  return selected.slice(0, limit);
}

function isQuakeSort(raw: string): raw is QuakeSort {
  return raw === "magnitude" || raw === "time";
}

function isFiniteNumberToken(raw: string): boolean {
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw)) {
    return false;
  }

  return Number.isFinite(Number(raw));
}

function isPositiveIntegerToken(raw: string): boolean {
  if (!/^[1-9]\d*$/.test(raw)) {
    return false;
  }

  const value = Number(raw);
  return Number.isSafeInteger(value) && String(value) === raw;
}
