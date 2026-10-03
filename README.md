# faultline

Faultline is a public TypeScript resume CLI for USGS significant earthquakes. The feed is free and needs no API key. Day 1 parses a checked-in GeoJSON fixture into `{ id, magnitude, place, time }` (epoch milliseconds, matching USGS `properties.time`) and does not call the network. Later days will fetch the live significant-day feed.

## Day 1

```bash
npm install
npm test
```

`npm test` loads `fixtures/significant_day.sample.geojson` from disk and checks the parsed quake fields.
