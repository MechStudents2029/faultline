# Week plan

## Day 1 — Parse fixture GeoJSON

Status: done, squash-merged to `main` in pull request #1

`parseQuakes` reads `fixtures/significant_day.sample.geojson` and returns `{ id, magnitude, place, time }`. `time` stays USGS epoch milliseconds. Vitest loads that file from disk and does not open the network. A feature is rejected with `TypeError` when `id` is not a non-empty string, or when `properties.mag`, `properties.place`, or `properties.time` is missing or has the wrong type.

## Day 2 — `npm run quakes`

Status: done, squash-merged to `main` in pull request #2

The squash commit is `f9e33e557b70c87d3f9aba3a1c0eff0ac1d29083`. GitHub deleted `cursor/day2-quakes-cli-0479`. `npm run quakes` is `tsx src/quakes.ts`. `readMinMagnitude` runs on `process.argv` before `fetch`, so a missing or non-numeric flag fails before any USGS request.

Add an `npm run quakes` script that fetches the live feed and prints quakes as JSON.

1. GET `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson` with `fetch`. Send no API key and no auth header.
2. Pass the parsed JSON to `parseQuakes`.
3. Write the quake array to stdout as JSON.
4. Honor `--min-magnitude <number>`. When the flag is set, drop quakes whose `magnitude` is lower than that number. When the flag is omitted, print every quake the parser returned.

Keep `tests/parseQuakes.test.ts` on the fixture file. Cover the magnitude filter with an in-memory FeatureCollection so the suite still does not call USGS. Leave `parseQuakes` returning every valid feature; the flag is a CLI filter on that list.

## Day 3 — README

Status: unstarted

Day 2 is on `main`. The README still describes `npm run quakes` as future work. Day 3 replaces that preview with the command that actually runs. It does not change the field mapping: `id` stays on the Feature, and `mag`, `place`, and `time` stay under `properties`.

Write these notes:

- `npm run quakes` runs `tsx src/quakes.ts`, GETs the significant-day feed, and prints the parsed array as two-space JSON.
- `npm run quakes -- --min-magnitude <number>` forwards the flag. The `--` is required so npm does not consume it.
- The filter keeps `magnitude >=` the threshold. Omitting the flag prints every parsed quake. A missing or non-numeric value throws `TypeError` before `fetch`.
- A significant day with no events is a successful FeatureCollection whose `features` array is empty. The CLI prints `[]` and exits 0.
- `tests/minMagnitude.test.ts` uses an in-memory collection (4.7, 5, 6.2) and spies on `fetch`. `npm test` still does not call USGS.
- The feed stays anonymous: no API key and no `Authorization` header.
- Leave `geometry` out of the record. Longitude, latitude, and depth stay off `{ id, magnitude, place, time }`.
