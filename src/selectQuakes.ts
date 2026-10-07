import type { Quake } from "./parseQuakes.js";

const MIN_MAGNITUDE_FLAG = "--min-magnitude";
const LIMIT_FLAG = "--limit";
const SORT_FLAG = "--sort";

export type QuakeSort = "magnitude";

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
 * Read `--sort magnitude` from CLI args.
 * Returns undefined when the flag is omitted, which keeps feed order.
 */
export function readSort(argv: readonly string[]): QuakeSort | undefined {
  const index = argv.indexOf(SORT_FLAG);
  if (index === -1) {
    return undefined;
  }

  const raw = argv[index + 1];
  if (raw === undefined) {
    throw new TypeError("--sort requires magnitude");
  }

  if (raw !== "magnitude") {
    throw new TypeError(`--sort expects magnitude, received ${raw}`);
  }

  return "magnitude";
}

/**
 * CLI selection on a `parseQuakes` result.
 * Drops quakes below `--min-magnitude`, optionally orders by magnitude
 * descending, then keeps the first `--limit` rows. Omitted flags keep
 * the whole list in feed order.
 */
export function selectQuakes(
  quakes: readonly Quake[],
  argv: readonly string[],
): Quake[] {
  const minMagnitude = readMinMagnitude(argv);
  const limit = readLimit(argv);
  const sort = readSort(argv);

  const selected =
    minMagnitude === undefined
      ? [...quakes]
      : quakes.filter((quake) => quake.magnitude >= minMagnitude);

  if (sort === "magnitude") {
    selected.sort((left, right) => right.magnitude - left.magnitude);
  }

  if (limit === undefined) {
    return selected;
  }

  return selected.slice(0, limit);
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
