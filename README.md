# ledger

Processing Pitt's annual financial disclosure reports.

### How To

- Place CSV files to be processed in the `data directory
- Update `common.js` with the fiscal year(s)
- Run `node import.js` to place the transactions into the main CSV file
- Run `node web.js`to launch the web interface
