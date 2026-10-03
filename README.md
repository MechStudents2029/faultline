# faultline

Faultline is a public TypeScript resume CLI for USGS significant earthquakes. The feed is free and needs no API key. Day 1 parses a checked-in GeoJSON fixture into `{ id, magnitude, place, time }` (epoch milliseconds, matching USGS `properties.time`) and does not call the network. Later days will fetch the live significant-day feed.

## USGS feature shape

`parseQuakes` accepts a GeoJSON object whose `type` is `FeatureCollection`. Each member of `features` must be a `Feature`.

- `id` sits on the Feature, beside `type`, `properties`, and `geometry`. It must be a non-empty string such as `us1000sample1`. The parser does not read an id from `properties`.
- `properties.mag` must be a finite number. It is returned as `magnitude`.
- `properties.place` must be a non-empty string.
- `properties.time` must be a finite number of epoch milliseconds. It is returned as `time` with the same numeric value. The parser does not turn it into an ISO-8601 string.

Other `properties` fields (`title`, `magType`, `url`, `alert`, `sig`, `status`) are ignored. `geometry` is a Point `[longitude, latitude, depth]` and is not part of the Day 1 record.

## Day 1

```bash
npm install
npm test
```

`npm test` loads `fixtures/significant_day.sample.geojson` from disk and checks the parsed quake fields.
