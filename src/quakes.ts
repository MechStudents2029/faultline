import { readFormat, renderQuakes } from "./formatQuakes.js";
import { parseQuakes } from "./parseQuakes.js";
import {
  readLimit,
  readMinMagnitude,
  readSort,
  selectQuakes,
} from "./selectQuakes.js";

const SIGNIFICANT_DAY_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson";

async function loadSignificantDay(): Promise<unknown> {
  const response = await fetch(SIGNIFICANT_DAY_URL);
  if (!response.ok) {
    throw new Error(
      `USGS significant-day feed failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<unknown>;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  readMinMagnitude(argv);
  readLimit(argv);
  readSort(argv);
  const format = readFormat(argv);

  const quakes = selectQuakes(parseQuakes(await loadSignificantDay()), argv);
  process.stdout.write(renderQuakes(quakes, format));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
