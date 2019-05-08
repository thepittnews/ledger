# ledger

Processing Pitt's annual financial disclosure reports.

### How To

- Place PDF files to be processed in the working directory
- Ensure `db.sqlite3` has been `touch`-ed
- Update `importcsv.js` with the filename(s)
- Run `node importcsv.js` to place the transactions into SQLite3
- Run `node web.js`to launch the web interface
