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

Status: usage notes are on `main`

The README now documents the command that runs, not a preview of a future GET. Field mapping is unchanged: `id` stays on the Feature, and `mag`, `place`, and `time` stay under `properties`.

Landed in the README:

- `npm run quakes` runs `tsx src/quakes.ts`, GETs the significant-day feed, and prints the parsed array as two-space JSON.
- `npm run quakes -- --min-magnitude <number>` forwards the flag. The `--` is required so npm does not consume it.
- The filter keeps `magnitude >=` the threshold. Omitting the flag prints every parsed quake. A missing or non-numeric value throws `TypeError` before `fetch`.
- A significant day with no events is a successful FeatureCollection whose `features` array is empty. The CLI prints `[]` and exits 0.
- `tests/minMagnitude.test.ts` uses an in-memory collection (4.7, 5, 6.2) and spies on `fetch`. `npm test` still does not call USGS.
- The feed stays anonymous: no API key and no `Authorization` header.

Still open: `geometry`. Longitude, latitude, and depth stay off `{ id, magnitude, place, time }`.

## Day 4 — geometry

Status: done, squash-merged to `main` in pull request #3

The squash commit is `87007f7c1b1e39178e06435596b5dda5989dc4a5`. GitHub deleted `cursor/day4-quake-geometry-16ed`. `parseQuakes` returns `longitude`, `latitude`, and `depthKm` from each Point.

`parseQuakes` reads each Feature `geometry`. A USGS Point stores `coordinates` as `[longitude, latitude, depth in km]`. The parsed record is `{ id, magnitude, place, time, longitude, latitude, depthKm }`. A feature with missing geometry, a non-Point, or coordinates that are not three finite numbers is rejected with `TypeError`. The fixture test and the in-memory min-magnitude collection both expect those fields. `npm test` still does not call USGS.

## Day 5 — text summary

Status: done, squash-merged to `main` in pull request #4

The squash commit is `b3280495136eeaa6a832e45c411e7eb77b51cba4`. GitHub deleted `cursor/day5-format-text-e592`. `readFormat` runs before `fetch`. `--format text` prints one line per selected quake. `--format json` and an omitted flag keep the two-space JSON array.

Day 4 closed the geometry item left at the end of Day 3. JSON stays the default stdout of `npm run quakes`. Day 5 adds `--format text`, parsed before `fetch` the same way as `--min-magnitude`. When the flag's value is `text`, the CLI prints one line per selected quake instead of the JSON array:

`M 6.2  35 km  45 km SW of Copiapo, Chile  2024-03-09T16:00:00.000Z`

The line uses `magnitude`, `depthKm` (kilometers, the field Day 4 added), `place`, and `time` formatted as UTC. Longitude and latitude stay on the quake object and are not required on the text line. Omitting `--format`, or passing `--format json`, keeps today's JSON array. An unknown format throws `TypeError` before `fetch`. Tests build the lines from an in-memory quake list and do not call USGS. No new feed and no API key.

## Day 6 — limit or sort

Status: unstarted

Day 5 prints every selected quake, in feed order, as JSON or text. Day 6 can add `--limit <count>`, parsed before `fetch` the same way as `--min-magnitude` and `--format`. A positive integer would keep the first N selected quakes. Omitting the flag would keep the whole list. A missing or non-integer value would throw `TypeError` before `fetch`. An optional follow-on in the same day is `--sort magnitude`, which would order the selected list by magnitude descending before the limit is applied. Both stay on the existing significant-day feed: no new URL and no API key. Tests would cap or sort the same in-memory quake list the Day 5 suite uses and would spy on `fetch`.
