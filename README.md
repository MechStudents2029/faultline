# faultline

Faultline is a public TypeScript resume CLI for USGS significant earthquakes. The feed is free and needs no API key. Day 1 parses a checked-in GeoJSON fixture into `{ id, magnitude, place, time }` (epoch milliseconds, matching USGS `properties.time`) and does not call the network. Day 2 fetches the live significant-day feed with `npm run quakes`. Day 4 adds `longitude`, `latitude`, and `depthKm` from each Feature Point. Day 5 adds `--format text`, one summary line per selected quake. Day 6 adds `--limit` and `--sort magnitude`.

## Project goals

Faultline is a one-week resume CLI. Someone should be able to clone the repo and run it without an account or an API key.

- Day 1, done: map USGS GeoJSON to `{ id, magnitude, place, time }` from a fixture, covered by Vitest, with no network call.
- Day 2, done: `npm run quakes` fetches the live significant-day feed, prints JSON, and accepts `--min-magnitude` to hide smaller events.
- Day 3, noted in this README: `npm run quakes`, `--min-magnitude`, the empty-feed `[]` output, the inclusive filter, the offline tests, and the no-key feed URL.
- Day 4, done: `longitude`, `latitude`, and `depthKm` come from the Point. A missing or malformed geometry throws `TypeError`. The CLI prints those fields on every quake.
- Day 5, done: `--format text` prints one line per selected quake (magnitude, depth in km, place, UTC time). Omitting the flag, or `--format json`, keeps the JSON array.
- Day 6, done: `--limit <count>` keeps the first N selected quakes, and `--sort magnitude` orders by magnitude descending before that limit. Omitting either flag keeps the whole list in feed order.

`parseQuakes` stays a pure function. Fetching the feed and reading CLI flags belong beside it, not inside the parser.

## List live quakes

`npm run quakes` runs `tsx src/quakes.ts`. The script GETs the significant-day feed, passes the JSON body to `parseQuakes`, and writes the quake array to stdout as JSON with two-space indentation and a trailing newline.

```bash
npm install
npm run quakes
```

Each object is `{ id, magnitude, place, time, longitude, latitude, depthKm }`. `time` is still USGS epoch milliseconds. A non-OK HTTP response writes `USGS significant-day feed failed: <status> <statusText>` to stderr and sets the exit code to 1.

Pass `--min-magnitude` after npm's `--` so the flag reaches the script instead of npm:

```bash
npm run quakes -- --min-magnitude 5
```

The number is the lowest magnitude to print. `readMinMagnitude` reads the token immediately after the flag.

A quiet significant day is a successful response. USGS can return a FeatureCollection whose `features` array is empty when the past day has no significant earthquakes. `parseQuakes` maps that body to `[]`, and stdout is:

```text
[]
```

That empty array is not an error. The process exit code stays 0. The same `[]` line is printed when the feed has events but every magnitude is below `--min-magnitude`.

## `--min-magnitude` filter

`selectQuakes` keeps a quake when `magnitude` is greater than or equal to the flag. A quake whose magnitude equals the threshold stays. Quakes below it are dropped.

Omitting the flag returns a copy of every quake `parseQuakes` returned. `parseQuakes` does not read argv and still returns every valid feature.

`main` calls `readMinMagnitude` before `fetch`. These values never open a socket:

- `--min-magnitude` with no following token throws `TypeError` (`--min-magnitude requires a number`).
- A token that is not a finite number, such as `big`, throws `TypeError` (`--min-magnitude expects a finite number, received big`).

Either message is written to stderr and the exit code is 1. The accepted token is a finite decimal, optionally signed, with an optional fraction and exponent (`5`, `4.5`, `.5`, `1e1`).

## `--format` output

`readFormat` runs on `process.argv` before `fetch`, the same way `readMinMagnitude` does. Omitting `--format`, or passing `--format json`, writes the quake array as two-space JSON with a trailing newline. `--format text` writes one line per selected quake instead:

```bash
npm run quakes -- --format text
```

```text
M 6.2  35 km  45 km SW of Copiapo, Chile  2024-03-09T16:00:00.000Z
```

That line is magnitude, then `depthKm` with a `km` suffix, then `place`, then `time` formatted as a UTC ISO-8601 string (`Date.toISOString()`). Two spaces separate those four fields. Longitude and latitude stay on the quake object and are not printed on the line. JSON output still leaves `time` as epoch milliseconds; only the text line converts it.

The text line also omits `id`. JSON still prints all seven fields: `id`, `magnitude`, `place`, `time`, `longitude`, `latitude`, and `depthKm`. Text keeps four of them: `magnitude`, `depthKm`, `place`, and `time`. `parseQuakes` still returns epoch milliseconds. The ISO conversion lives only in `renderQuakes` when the format is `text`.

Magnitude and depth use JavaScript's default number text, not a fixed number of decimal places. The Chile sample's magnitude `6.2` stays `6.2` and its depth `35` stays `35`. The Hachijo-jima sample's depth `22.4` stays `22.4`. The depth suffix is one space and then `km`, as in `35 km`. `place` is copied as stored, including the single spaces and the comma in `45 km SW of Copiapo, Chile`. The two-space gaps sit only between the four fields, so a place that contains spaces stays one field.

`--format` with no following token throws `TypeError` (`--format requires json or text`). A token other than `json` or `text`, such as `csv`, throws `TypeError` (`--format expects json or text, received csv`). Either failure happens before `fetch`, and the message is written to stderr with exit code 1.

`readFormat` uses the same argv shape as `readMinMagnitude`: the flag is its own token, and the value is the next token. `--format=text` is not that flag, so it leaves the output as JSON. The value is case-sensitive. `--format TEXT` throws `TypeError` (`--format expects json or text, received TEXT`). `--format JSON` throws the same sentence with `JSON`. Those checks also run before `fetch`.

The flag composes with `--min-magnitude`. The filter runs first, then the chosen format prints whatever remains:

```bash
npm run quakes -- --min-magnitude 5 --format text
```

Either flag may come first. Both are read from the full argv list before `fetch`, so this prints the same lines as the command above:

```bash
npm run quakes -- --format text --min-magnitude 5
```

`readMinMagnitude` and `readFormat` each look up their own flag. One flag's value is not consumed by the other.

When that selection is empty, `--format text` writes no lines and does not write `[]`. Stdout is empty and the exit code stays 0. A quiet significant day does that, and so does a day whose events are all below `--min-magnitude`. `--format json` still prints the empty array with a trailing newline:

```text
[]
```

## `--limit` and `--sort`

`readLimit` and `readSort` run on `process.argv` before `fetch`, the same way `readMinMagnitude` and `readFormat` do. Selection order is fixed: drop quakes below `--min-magnitude`, then order by magnitude descending when `--sort magnitude` is set, then keep the first `--limit` rows. `--format json` and `--format text` both print that same list.

```bash
npm run quakes -- --limit 2
npm run quakes -- --sort magnitude --limit 2 --format text
```

`--limit 2` with no sort keeps the first two quakes in feed order. `--sort magnitude` orders the filtered list from largest magnitude to smallest, and the limit then keeps the first N of that ordered list, which are the N largest. Omitting `--limit` keeps every quake that survived the filter. Omitting `--sort` leaves feed order in place.

A missing `--limit` value throws `TypeError` (`--limit requires a positive integer`). Zero, a negative number, or a non-integer throws `TypeError` (`--limit expects a positive integer, received 0` for zero). A missing `--sort` value throws `TypeError` (`--sort requires magnitude`). Any other sort token throws `TypeError` (`--sort expects magnitude, received time`). Those checks happen before `fetch`, and the message is written to stderr with exit code 1.

`readLimit` accepts a decimal integer written as digits, with no sign, no fraction, and no exponent. The value has to be at least 1, and it has to be a safe integer so `Number` does not round it. The tests reject `0`, `-1`, `1.5`, `2.0`, `+3`, `01`, and `big`. `2.0` is a whole number written with a fraction, and `+3` is positive, but neither token is that digit form. `01` has a leading zero, so it is rejected even though the numeric value is 1. `1e1` is rejected the same way. A digit string that is not a safe integer, such as `9007199254740993`, is rejected because `Number` would round it. The received token is copied into the message, so `--limit 1.5` throws `--limit expects a positive integer, received 1.5`.

`readSort` uses the same argv shape as `readLimit`: the flag is its own token, and the value is the next token. `--sort=magnitude` is not that flag, so the list stays in feed order. The value is case-sensitive. `--sort MAGNITUDE` throws `TypeError` (`--sort expects magnitude, received MAGNITUDE`). `--sort time` throws the same sentence with `time`. Those checks also run before `fetch`.

`--limit` counts rows after the filter and the sort, not features in the raw feed. On the three-quake in-memory list, `--limit 9` returns `low`, `edge`, and `high` because the count is larger than the list. `--min-magnitude 5 --limit 1` returns only `edge`: `low` is already gone, and feed order of what remains puts `edge` first. When the filter removes every quake, sort and limit both see an empty list. `--format json` still prints `[]` with a trailing newline, and `--format text` still prints no lines.

`--sort magnitude` is a stable descending sort. Two quakes with the same magnitude keep the order they had in the feed. The tie test builds `first` and `second` at magnitude 5, then `largest` at 6.2. After `--sort magnitude` the ids are `largest`, `first`, `second`. The sort copies the list first, so the array returned by `parseQuakes` stays in feed order.

`--limit`, `--sort`, `--min-magnitude`, and `--format` each look up their own flag. One flag's value is not consumed by the other, and the order of the flags does not change the selection. These two commands select the same quakes, the two largest that remain after the magnitude filter, and print the same text lines:

```bash
npm run quakes -- --sort magnitude --limit 2 --format text
npm run quakes -- --format text --limit 2 --sort magnitude
```

Sort still runs before the limit. Putting `--limit` earlier in argv does not keep the first two feed rows when `--sort magnitude` is also set.

## Location fields

`parseQuakes` copies the Feature Point onto the same object the CLI prints. For the first fixture event that object is:

```json
{
  "id": "us1000sample1",
  "magnitude": 6.2,
  "place": "45 km SW of Copiapo, Chile",
  "time": 1710000000000,
  "longitude": -71.2,
  "latitude": -27.4,
  "depthKm": 35
}
```

`longitude` and `latitude` are decimal degrees. The other two fixture events use the same keys: Korumburra is longitude `145.8401`, latitude `-38.3802`, depth `10`; Hachijo-jima is longitude `140.9`, latitude `32.6`, depth `22.4`.

`depthKm` is kilometers, the unit USGS stores in the third coordinate. It is not meters and it is not feet. A positive value is below the surface; the parser does not convert or abs the number. The Chile sample's `35` is 35 km down, the Korumburra sample's `10` is 10 km down, and the Hachijo-jima sample's `22.4` is 22.4 km down.

Coordinate order is GeoJSON `[longitude, latitude, depth]`, not a latitude-first pair. The Chile sample's `coordinates` array is `[-71.2, -27.4, 35]`: longitude `-71.2`, then latitude `-27.4`, then depth. Reading those first two numbers as latitude then longitude would put the quake in the wrong hemisphere. The parser keeps the array order and names the fields `longitude`, `latitude`, and `depthKm`.

## USGS feature shape

`parseQuakes` accepts a GeoJSON object whose `type` is `FeatureCollection`. Each member of `features` must be a `Feature`.

- `id` sits on the Feature, beside `type`, `properties`, and `geometry`. It must be a non-empty string such as `us1000sample1`. The parser does not read an id from `properties`.
- `properties.mag` must be a finite number. It is returned as `magnitude`.
- `properties.place` must be a non-empty string.
- `properties.time` must be a finite number of epoch milliseconds. It is returned as `time` with the same numeric value. The parser does not turn it into an ISO-8601 string.
- `geometry` must be a GeoJSON Point. `coordinates` must be three finite numbers, `[longitude, latitude, depth in km]`. They are returned as `longitude`, `latitude`, and `depthKm`. Missing geometry, a non-Point, a coordinate array of the wrong length, or a non-finite coordinate throws `TypeError`.

Other `properties` fields (`title`, `magType`, `url`, `alert`, `sig`, `status`) are ignored. The parser does not read an id from `properties`, and it does not rescale depth.

## Fixture

`fixtures/significant_day.sample.geojson` is checked-in sample data in the significant-day shape. It is not a live download. `metadata.count` is 3, `metadata.generated` is `1710000000000`, and `metadata.url` is the public significant-day feed.

| id | mag | place | time (epoch ms) | longitude | latitude | depthKm |
| --- | --- | --- | --- | --- | --- | --- |
| us1000sample1 | 6.2 | 45 km SW of Copiapo, Chile | 1710000000000 | -71.2 | -27.4 | 35 |
| us1000sample2 | 4.7 | 5 km NNE of Korumburra, Australia | 1710007200000 | 145.8401 | -38.3802 | 10 |
| us1000sample3 | 5.1 | 120 km ESE of Hachijo-jima, Japan | 1710010800000 | 140.9 | 32.6 | 22.4 |

Those three location columns are the Point `coordinates` in GeoJSON order. `tests/parseQuakes.test.ts` compares them exactly, along with `id`, `magnitude`, `place`, and `time`.

The first event's `time` is 2024-03-09T16:00:00.000Z. The second is two hours later (`1710007200000`) and the third is one hour after that (`1710010800000`). Tests compare these values exactly, so a fixture edit has to update `tests/parseQuakes.test.ts` in the same change.

## How to run the tests

The package requires Node.js 20 or newer (`engines` in `package.json`). From the repository root:

```bash
npm install
npm test
npm run typecheck
```

`npm test` runs `vitest run` once. `vitest.config.ts` sets `environment` to `node` and includes `tests/**/*.test.ts`. The suite reads `fixtures/significant_day.sample.geojson` with `readFileSync` and `JSON.parse`. It checks the three quake records, including `longitude`, `latitude`, and `depthKm`, checks that the first `time` is still `1710000000000`, and checks that `parseQuakes({ type: "Feature", id: "x" })` throws `TypeError`. A fourth test builds an in-memory feature and expects `TypeError` when geometry is missing, when it is a LineString, when the coordinate array has only two numbers, and when depth is a string. That command does not open a socket.

`tests/minMagnitude.test.ts` does not read the fixture and does not call USGS. It builds an in-memory FeatureCollection with magnitudes 4.7 (`low`), 5 (`edge`), and 6.2 (`high`). Each feature has a Point: `low` is `[-71.2, -27.4, 35]`, `edge` is `[145.8401, -38.3802, 10]`, and `high` is `[140.9, 32.6, 22.4]`. `selectQuakes` with `--min-magnitude 5` keeps `edge` and `high` and drops `low`, which checks the inclusive boundary, and the kept objects still carry `longitude`, `latitude`, and `depthKm`. A second test omits the flag and expects every parsed quake. A third test expects `TypeError` from `readMinMagnitude(["--min-magnitude"])` and from `readMinMagnitude(["--min-magnitude", "big"])`. The filter test spies on `globalThis.fetch` and asserts it was not called.

`tests/formatQuakes.test.ts` also stays off the network. It builds text lines from an in-memory quake list, including `M 6.2  35 km  45 km SW of Copiapo, Chile  2024-03-09T16:00:00.000Z`, checks that `--format json` and an omitted flag still render two-space JSON, checks that `--format text` composed with `--min-magnitude 5` drops the 4.7 event, and expects `TypeError` from `readFormat(["--format"])` and from `readFormat(["--format", "csv"])`. Those tests spy on `globalThis.fetch` and assert it was not called.

The same file locks the three in-memory lines `M 4.7  35 km  low place  2024-03-09T16:00:00.000Z`, `M 5  10 km  edge place  2024-03-09T16:00:00.000Z`, and `M 6.2  22.4 km  high place  2024-03-09T16:00:00.000Z`. It asserts those lines do not contain the longitudes `-71.2` or `145.8401`. `renderQuakes([], "text")` is an empty string, while the JSON expectation is `JSON.stringify(quakes, null, 2)` plus a trailing newline. The composition case passes `["--min-magnitude", "5", "--format", "text"]` to both `selectQuakes` and `readFormat`, so the 4.7 line is absent. None of that calls USGS.

`tests/limitSort.test.ts` uses the same in-memory magnitudes 4.7 (`low`), 5 (`edge`), and 6.2 (`high`). `--limit 2` keeps `low` then `edge`. `--sort magnitude` yields `high`, `edge`, `low`, and `--sort magnitude --limit 2` yields `high` then `edge`. `--min-magnitude 5 --limit 1` keeps `edge`, the first quake that passed the filter, not `low`. The text and JSON cases render that selected list and spy on `globalThis.fetch`. `npm test` runs those twenty-three tests in four files and does not call USGS.

That file has eleven tests. One expects `--limit 2` to leave the parsed array in feed order (`low`, `edge`, `high`) while the selected copy is `low`, `edge`. One expects `readLimit([])` to be `undefined`. One expects `--min-magnitude 5 --limit 1` to keep `edge`. The rejection test expects `TypeError` for a missing value and for `0`, `-1`, `1.5`, `2.0`, `+3`, `01`, and `big`, and it spies on `globalThis.fetch`. The sort tests expect `high`, `edge`, `low`, expect `readSort([])` to be `undefined`, and expect `TypeError` for a missing value, for `time`, and for `MAGNITUDE`. A swapped-flag test expects both `--sort magnitude --limit 2` and `--limit 2 --sort magnitude` to keep `high` then `edge`. The tie test expects `largest`, `first`, `second`. `--limit 9` keeps all three ids. The format test expects the two text lines for `high` and `edge` and a two-space JSON array whose only id is `high`. Each fetch spy asserts it was not called.

`npm run typecheck` runs `tsc --noEmit`. `tsconfig.json` enables `strict`, targets ES2022, and resolves modules with `NodeNext`. It typechecks `src`, `tests`, and `vitest.config.ts`, and it does not emit JavaScript.

## Free USGS feed (no API key)

`npm run quakes` GETs this URL with `fetch` and sends no API key, no signup, and no `Authorization` header:

https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson

USGS serves that summary to anonymous clients. The body is a GeoJSON FeatureCollection of earthquakes USGS labeled significant over the past day. The same URL is the `SIGNIFICANT_DAY_URL` constant in `src/quakes.ts` and `metadata.url` on the fixture. `npm test` still reads `fixtures/significant_day.sample.geojson` from disk, so a USGS outage or a missing network does not fail the suite. The CLI is the only path that opens a socket, and only after `--min-magnitude`, `--limit`, `--sort`, and `--format` parse.
