# Dashboard prototype

This React and TypeScript dashboard prototype uses Vite, Apache ECharts, and a bundled synthetic dataset to demonstrate reporting on Pakistan’s international voice traffic. It runs locally or on any static web host.

## Run locally

From this folder, with Node.js 20.19+ or 22.12+:

```sh
npm install
npm run dev
```

Use the URL printed by Vite. Run `npm run build` to type-check and generate `dist/`, or `npm run preview` to serve that build locally.

## Demo screens

| Screen | What to try |
| --- | --- |
| Executive overview | Date range, dimension filters, call and minute trends, traffic split, country map, operator rankings, and open alarms |
| Incoming and outgoing traffic | Local operator and LDI routing, country and carrier rankings, and average duration |
| Country analysis | Select a map point or table row to drill down into the country |
| Operator and carrier analysis | Switch between LDI, local, and international carriers. Select a row to see its trends and related traffic |
| Probe vs. industry | Compare sample PTA-reported figures with probe minutes by day, week, or month and by operator category |
| Transit and non-whitelisted traffic | View sample country pairs, carrier breakdowns, flagged gateways, and traffic trends |
| Alerts | Create or edit a KPI rule, evaluate demo rules, filter alarm history, and close an open alarm |
| Data quality | Download and re-upload the sample CSV to reproduce two accepted records, one rejected row, and one duplicate. Inspect batch reports and reference data |

Traffic screens export filtered aggregate data as CSV. The demo covers 24 August to 21 November 2026. Hourly charts show a synthetic profile for the final selected day. Times are displayed in Pakistan Standard Time.

Imports validate CSVs locally and keep only counts and row-level issue summaries for the current session. Alert rules and alarm states persist in browser storage. PTA data, database batches, classifications, and operator or carrier assignments are demonstration fixtures. The application has no login, database, external notification transport, or production integrations.

## References

- The client’s proposal and execution plan define the screen and workflow scope.
- CDR terminology and parameter context. [ETSI TS 132 298](https://www.etsi.org/deliver/etsi_ts/132200_132299/132298/16.13.00_60/ts_132298v161300p.pdf)
- International numbering and Pakistan’s country code. [ITU-T E.164](https://www.itu.int/rec/T-REC-E.164-202602-I) and [PTA numbering plan via ITU](https://www.itu.int/dms_pub/itu-t/oth/02/02/T02020000A10002PDFE.pdf)
- World map shapes are derived from [Natural Earth 1:110m Admin 0 Countries](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/).
