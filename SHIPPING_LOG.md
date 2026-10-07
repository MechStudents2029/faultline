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

## 2026-10-05 — Day 4 squash-merged

Pull request #3, "Day 4: read longitude, latitude, and depth from geometry", was squash-merged into `main`. The merge commit is `87007f7c1b1e39178e06435596b5dda5989dc4a5`. It carries the Point fields on `parseQuakes`, the updated fixture expectations, and the in-memory min-magnitude Points. GitHub deleted `cursor/day4-quake-geometry-16ed` after the merge, so `main` holds one Day 4 commit rather than the branch commit plus a second copy.

## 2026-10-05 — README notes after the Day 4 merge

The Day 4 geometry entry above described the tree at the squash merge, when the README still showed `{ id, magnitude, place, time }`. The README on `main` now shows an example object with `longitude`, `latitude`, and `depthKm`, states that `depthKm` is kilometers (positive down, not meters), and states that `coordinates` are `[longitude, latitude, depth]`. The fixture table includes those three columns. The test notes describe the offline geometry `TypeError` cases and the Points on the in-memory min-magnitude features. `WEEK_PLAN.md` records the squash commit and sketches Day 5 (`--format text`) as unstarted. No new feed and no API key.

## 2026-10-06 — Day 5 text summary

- `npm run quakes` accepts `--format json|text`, read from argv before `fetch`. Omitting the flag or passing `json` still prints the two-space JSON array.
- `--format text` prints one line per selected quake: magnitude, `depthKm` in km, place, and `time` as a UTC ISO string.
- A missing or unknown format throws `TypeError` before `fetch`. The flag composes with `--min-magnitude`.
- `tests/formatQuakes.test.ts` builds those lines from an in-memory quake list and spies on `fetch`. No new feed and no API key.

## 2026-10-06 — Day 5 squash-merged

Pull request #4, "Day 5: print a text summary with --format text", was squash-merged into `main`. The merge commit is `b3280495136eeaa6a832e45c411e7eb77b51cba4`. It carries `src/formatQuakes.ts`, `tests/formatQuakes.test.ts`, the `--format` read in `src/quakes.ts`, and the README example line. GitHub deleted `cursor/day5-format-text-e592` after the merge, so `main` holds one Day 5 commit rather than the branch commit plus a second copy.

## Still open after the Day 5 merge

- Day 6 has not started. The CLI does not take `--limit`, and it does not sort by magnitude. Selected quakes stay in feed order, and `--format text` prints every one of them.
- The text renderer does not add a header row. An empty selection prints no lines. JSON still prints `[]`.

## 2026-10-06 — README notes after the Day 5 merge

The Day 5 text-summary entry above described the tree at the squash merge. The README on `main` now records that an empty `--format text` selection prints no lines (JSON still prints `[]`), that `--format` is a separate case-sensitive token (`--format=text`, `TEXT`, and `JSON` do not select a format), and that the text line drops `id` as well as longitude and latitude. Magnitude and depth use their default decimal text, and `place` is copied verbatim, including the spaces in the Chile sample. The README also shows `npm run quakes -- --format text --min-magnitude 5` as the same selection as the other flag order. The test notes list the three in-memory lines (`low` at 4.7, `edge` at 5, `high` at 6.2) and the empty-string text case. `WEEK_PLAN.md` records squash commit `b3280495136eeaa6a832e45c411e7eb77b51cba4` and sketches Day 6 (`--limit`, optionally `--sort magnitude`) as unstarted. No new feed and no API key.

## 2026-10-07 — Day 6 limit and sort

- `npm run quakes` accepts `--limit <count>` and `--sort magnitude`, both read from argv before `fetch`.
- `--limit` keeps the first N quakes after the min-magnitude filter. Omitting it keeps the whole list. A missing, zero, negative, or non-integer value throws `TypeError`.
- `--sort magnitude` orders by magnitude descending before the limit. Omitting it keeps feed order. Any other value throws `TypeError`.
- `--format json` and `--format text` print that same selected list. `tests/limitSort.test.ts` uses an in-memory list and spies on `fetch`. No new feed and no API key.
