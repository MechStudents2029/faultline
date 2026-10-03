# faultline

Faultline is a public TypeScript resume CLI for USGS significant earthquakes. The feed is free and needs no API key. Day 1 parses a checked-in GeoJSON fixture into `{ id, magnitude, place, time }` (epoch milliseconds, matching USGS `properties.time`) and does not call the network. Later days will fetch the live significant-day feed.

## Project goals

Faultline is a one-week resume CLI. Someone should be able to clone the repo and run it without an account or an API key.

- Day 1, done: map USGS GeoJSON to `{ id, magnitude, place, time }` from a fixture, covered by Vitest, with no network call.
- Day 2, not started: `npm run quakes` fetches the live significant-day feed, prints JSON, and accepts `--min-magnitude` to hide smaller events.
- Day 3, not started: the README shows that command, the feed URL, and the fact that fixture tests stay offline.

`parseQuakes` stays a pure function. Fetching the feed and reading CLI flags belong beside it, not inside the parser.

## USGS feature shape

`parseQuakes` accepts a GeoJSON object whose `type` is `FeatureCollection`. Each member of `features` must be a `Feature`.

- `id` sits on the Feature, beside `type`, `properties`, and `geometry`. It must be a non-empty string such as `us1000sample1`. The parser does not read an id from `properties`.
- `properties.mag` must be a finite number. It is returned as `magnitude`.
- `properties.place` must be a non-empty string.
- `properties.time` must be a finite number of epoch milliseconds. It is returned as `time` with the same numeric value. The parser does not turn it into an ISO-8601 string.

Other `properties` fields (`title`, `magType`, `url`, `alert`, `sig`, `status`) are ignored. `geometry` is a Point `[longitude, latitude, depth]` and is not part of the Day 1 record.

## Fixture

`fixtures/significant_day.sample.geojson` is checked-in sample data in the significant-day shape. It is not a live download. `metadata.count` is 3, `metadata.generated` is `1710000000000`, and `metadata.url` is the public significant-day feed.

| id | mag | place | time (epoch ms) |
| --- | --- | --- | --- |
| us1000sample1 | 6.2 | 45 km SW of Copiapo, Chile | 1710000000000 |
| us1000sample2 | 4.7 | 5 km NNE of Korumburra, Australia | 1710007200000 |
| us1000sample3 | 5.1 | 120 km ESE of Hachijo-jima, Japan | 1710010800000 |

The first event's `time` is 2024-03-09T16:00:00.000Z. The second is two hours later (`1710007200000`) and the third is one hour after that (`1710010800000`). Tests compare these values exactly, so a fixture edit has to update `tests/parseQuakes.test.ts` in the same change.

## How to run the tests

The package requires Node.js 20 or newer (`engines` in `package.json`). From the repository root:

```bash
npm install
npm test
npm run typecheck
```

`npm test` runs `vitest run` once. `vitest.config.ts` sets `environment` to `node` and includes `tests/**/*.test.ts`. The suite reads `fixtures/significant_day.sample.geojson` with `readFileSync` and `JSON.parse`. It checks the three quake records, checks that the first `time` is still `1710000000000`, and checks that `parseQuakes({ type: "Feature", id: "x" })` throws `TypeError`. That command does not open a socket.

`npm run typecheck` runs `tsc --noEmit`. `tsconfig.json` enables `strict`, targets ES2022, and resolves modules with `NodeNext`. It typechecks `src`, `tests`, and `vitest.config.ts`, and it does not emit JavaScript.

## Free USGS feed (no API key)

Day 2 will GET this URL:

https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson

USGS serves that summary to anonymous clients. There is no API key, no signup, and no `Authorization` header. The body is a GeoJSON FeatureCollection of earthquakes USGS labeled significant over the past day. The same URL is stored on the fixture as `metadata.url`. Day 1 never requests it. Tests keep reading the file on disk so a USGS outage or a missing network does not fail `npm test`.
