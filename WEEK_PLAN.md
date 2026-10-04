# Week plan

## Day 1 — Parse fixture GeoJSON

Status: done, squash-merged to `main` in pull request #1

`parseQuakes` reads `fixtures/significant_day.sample.geojson` and returns `{ id, magnitude, place, time }`. `time` stays USGS epoch milliseconds. Vitest loads that file from disk and does not open the network. A feature is rejected with `TypeError` when `id` is not a non-empty string, or when `properties.mag`, `properties.place`, or `properties.time` is missing or has the wrong type.

## Day 2 — `npm run quakes`

Status: done

Add an `npm run quakes` script that fetches the live feed and prints quakes as JSON.

1. GET `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson` with `fetch`. Send no API key and no auth header.
2. Pass the parsed JSON to `parseQuakes`.
3. Write the quake array to stdout as JSON.
4. Honor `--min-magnitude <number>`. When the flag is set, drop quakes whose `magnitude` is lower than that number. When the flag is omitted, print every quake the parser returned.

Keep `tests/parseQuakes.test.ts` on the fixture file. Cover the magnitude filter with an in-memory FeatureCollection so the suite still does not call USGS. Leave `parseQuakes` returning every valid feature; the flag is a CLI filter on that list.

## Day 3 — README

Status: unstarted

Once `npm run quakes` works, document the real command in the README: the significant-day feed URL, that the feed needs no API key, the `--min-magnitude` flag, and a sample of the JSON it prints. State again that `npm test` reads `fixtures/significant_day.sample.geojson` from disk and does not open the network.

Day 3 does not change the field mapping. `id` stays on the Feature. `mag`, `place`, and `time` stay under `properties`. The README already previews the feed URL from the Day 1 notes; Day 3 should replace that preview with the command that actually runs.
