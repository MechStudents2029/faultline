import type { Quake } from "./parseQuakes.js";

const MIN_MAGNITUDE_FLAG = "--min-magnitude";

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
 * CLI filter on a `parseQuakes` result.
 * Drops quakes whose magnitude is lower than `--min-magnitude`.
 * When the flag is omitted, returns every quake.
 */
export function selectQuakes(
  quakes: readonly Quake[],
  argv: readonly string[],
): Quake[] {
  const minMagnitude = readMinMagnitude(argv);
  if (minMagnitude === undefined) {
    return [...quakes];
  }

  return quakes.filter((quake) => quake.magnitude >= minMagnitude);
}

function isFiniteNumberToken(raw: string): boolean {
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw)) {
    return false;
  }

  return Number.isFinite(Number(raw));
}
