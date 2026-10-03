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
