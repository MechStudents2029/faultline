# Week plan

## Day 1 — Parse fixture GeoJSON

Status: done

Parse USGS earthquake GeoJSON `features` into `{ id, magnitude, place, time }` from the checked-in fixture `fixtures/significant_day.sample.geojson`. `time` is USGS epoch milliseconds. Vitest loads the fixture from disk and does not open the network.

## Day 2 — `npm run quakes`

Status: unstarted

`npm run quakes` fetches https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson and prints JSON. A `--min-magnitude` flag filters the printed quakes.

## Day 3 — README

Status: unstarted

README documents the significant-day feed URL, that the feed needs no API key, and that fixture tests stay offline.
