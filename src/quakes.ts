import { loadFeed, readFeed } from "./feed.js";
import { readFormat, renderQuakes } from "./formatQuakes.js";
import { parseQuakes } from "./parseQuakes.js";
import {
  readLimit,
  readMaxDepth,
  readMaxMagnitude,
  readMinDepth,
  readMinMagnitude,
  readMinTime,
  readMaxTime,
  readPlace,
  readSort,
  selectQuakes,
} from "./selectQuakes.js";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  readMinMagnitude(argv);
  readMaxMagnitude(argv);
  readPlace(argv);
  readMaxDepth(argv);
  readMinDepth(argv);
  readMinTime(argv);
  readMaxTime(argv);
  readLimit(argv);
  readSort(argv);
  const format = readFormat(argv);
  const feed = readFeed(argv);

  const quakes = selectQuakes(parseQuakes(await loadFeed(feed)), argv);
  process.stdout.write(renderQuakes(quakes, format));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
