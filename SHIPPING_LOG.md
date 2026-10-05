# Shipping log

## 2026-10-03 — Day 1 scaffold

- Added a TypeScript package named `faultline` with Vitest and a strict `tsconfig`.
- Checked in `fixtures/significant_day.sample.geojson`, a small FeatureCollection in the USGS significant-day shape (`id` on the feature; `mag`, `place`, and `time` on `properties`).
- `parseQuakes` maps those features to `{ id, magnitude, place, time }` and keeps `time` as epoch milliseconds.
- `npm test` reads the fixture from disk. No live HTTP, no CLI, no API key.
- Day 2 (`npm run quakes` plus `--min-magnitude`) and Day 3 (feed URL in the README) are still unstarted.

## 2026-10-03 — Day 1 squash-merged

Pull request #1, "Day 1: parse USGS earthquake GeoJSON from a fixture", was squash-merged into `main`. That merge commit carries `src/parseQuakes.ts`, `tests/parseQuakes.test.ts`, and the three-event fixture. GitHub deleted `cursor/day1-geojson-parse-4d0e` after the merge, so `main` holds one Day 1 commit rather than the branch commit plus a second copy.

## Still open after the Day 1 merge

- Day 2 has not started. `package.json` scripts are `test` and `typecheck` only. There is no `quakes` script, no `fetch` of the significant-day feed, and no `--min-magnitude` filter.
- Day 3 has not started. The README describes the parser, the fixture, and the public feed, and it does not yet show a working `npm run quakes` invocation or sample output.
- `parseQuakes` still ignores `geometry`. The fixture stores `[longitude, latitude, depth]` on each Point, and those numbers are not part of `{ id, magnitude, place, time }`.

## 2026-10-04 — Day 2 live feed

- `npm run quakes` GETs the public significant-day feed with `fetch`, passes the body to `parseQuakes`, and writes the quake array to stdout as JSON.
- `--min-magnitude <number>` drops quakes below that magnitude. Omitting the flag prints every parsed quake. `parseQuakes` itself still returns every valid feature.
- `tests/minMagnitude.test.ts` covers the filter with an in-memory FeatureCollection. It does not request USGS. The Day 1 fixture test is unchanged.
- Day 3 has not started. The README does not yet document the working command or a sample of its JSON.

## Still open after Day 2

- Day 3 has not started. The README describes the parser, the fixture, and the public feed, and it does not yet show a working `npm run quakes` invocation or sample output.
- `parseQuakes` still ignores `geometry`. The fixture stores `[longitude, latitude, depth]` on each Point, and those numbers are not part of `{ id, magnitude, place, time }`.

## 2026-10-04 — Day 2 squash-merged

Pull request #2, "Day 2: fetch the USGS significant-day feed with npm run quakes", was squash-merged into `main`. The merge commit is `f9e33e557b70c87d3f9aba3a1c0eff0ac1d29083`. It carries `src/quakes.ts`, `src/selectQuakes.ts`, `tests/minMagnitude.test.ts`, the `quakes` script (`tsx src/quakes.ts`), and the `tsx` devDependency. GitHub deleted `cursor/day2-quakes-cli-0479` after the merge, so `main` holds one Day 2 commit rather than the branch commit plus a second copy.

## 2026-10-04 — README notes for the quakes command

The "Still open after Day 2" note above described the tree at the squash merge. The README on `main` now shows `npm run quakes`, `npm run quakes -- --min-magnitude 5`, the inclusive `>=` filter, the two `TypeError` messages, and that a valid empty significant-day feed prints `[]` with exit code 0. It also records that `tests/minMagnitude.test.ts` stays on an in-memory FeatureCollection and that the feed needs no API key.

## Still open after those README notes

- `parseQuakes` still ignores `geometry`. The fixture stores `[longitude, latitude, depth]` on each Point, and those numbers are not part of `{ id, magnitude, place, time }`.

## 2026-10-05 — Day 4 geometry

- `parseQuakes` copies `geometry.coordinates` `[longitude, latitude, depth in km]` onto each quake as `longitude`, `latitude`, and `depthKm`.
- Missing geometry, a non-Point, or coordinates that are not three finite numbers throw `TypeError`.
- `tests/parseQuakes.test.ts` expects the three fixture points. `tests/minMagnitude.test.ts` puts a Point on each in-memory feature. `npm test` still does not call USGS.
- The README still describes `{ id, magnitude, place, time }` and does not yet show the location fields.
