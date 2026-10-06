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

/**
 * Render selected quakes for stdout.
 * `json` is a two-space JSON array. `text` is one line per quake.
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

  return `${quakes.map(formatQuakeLine).join("\n")}\n`;
}

function formatQuakeLine(quake: Quake): string {
  const time = new Date(quake.time).toISOString();
  return `M ${quake.magnitude}  ${quake.depthKm} km  ${quake.place}  ${time}`;
}

function isQuakeFormat(raw: string): raw is QuakeFormat {
  return raw === "json" || raw === "text";
}
