# Week plan

## Day 1 — Parse fixture GeoJSON

Status: done, squash-merged to `main` in pull request #1

`parseQuakes` reads `fixtures/significant_day.sample.geojson` and returns `{ id, magnitude, place, time }`. `time` stays USGS epoch milliseconds. Vitest loads that file from disk and does not open the network. A feature is rejected with `TypeError` when `id` is not a non-empty string, or when `properties.mag`, `properties.place`, or `properties.time` is missing or has the wrong type.

## Day 2 — `npm run quakes`

Status: unstarted

`npm run quakes` fetches https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson and prints JSON. A `--min-magnitude` flag filters the printed quakes.

## Day 3 — README

Status: unstarted

README documents the significant-day feed URL, that the feed needs no API key, and that fixture tests stay offline.
