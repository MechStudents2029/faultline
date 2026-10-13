import type { Quake } from "./parseQuakes.js";

const FORMAT_FLAG = "--format";

export type QuakeFormat = "json" | "text";

/**
 * Read `--format <json|text>` from CLI args.
 * Returns `json` when the flag is omitted.
 */
export function readFormat(argv: readonly string[]): QuakeFormat {
  const index = argv.indexOf(FORMAT_FLAG);
  if (index === -1) {
    return "json";
  }

  const raw = argv[index + 1];
  if (raw === undefined) {
    throw new TypeError("--format requires json or text");
  }

  if (!isQuakeFormat(raw)) {
    throw new TypeError(`--format expects json or text, received ${raw}`);
  }

  return raw;
}

const TEXT_HEADER = "magnitude  depth in km  place  UTC time";

/**
 * Render selected quakes for stdout.
 * `json` is a two-space JSON array with no header and no count line.
 * `text` starts with one header line naming magnitude, depth in km, place,
 * and UTC time, then one line per quake, then one trailing count of those
 * quake lines (`1 quake` or `N quakes`). An empty text selection is empty:
 * no header, no quake lines, and no count.
 */
export function renderQuakes(
  quakes: readonly Quake[],
  format: QuakeFormat,
): string {
  if (format === "json") {
    return `${JSON.stringify(quakes, null, 2)}\n`;
  }

  if (quakes.length === 0) {
    return "";
  }

  const lines = quakes.map(formatQuakeLine);
  return `${TEXT_HEADER}\n${lines.join("\n")}\n${formatQuakeCount(lines.length)}\n`;
}

function formatQuakeCount(count: number): string {
  return count === 1 ? "1 quake" : `${count} quakes`;
}

function formatQuakeLine(quake: Quake): string {
  const time = new Date(quake.time).toISOString();
  return `M ${quake.magnitude}  ${quake.depthKm} km  ${quake.place}  ${time}`;
}

function isQuakeFormat(raw: string): raw is QuakeFormat {
  return raw === "json" || raw === "text";
}
