# reader

Processing Pitt's annual financial disclosure reports.

### How To

- Place PDF files to be processed in the working directory
- Ensure `db.sqlite3` has been `touch`-ed
- Update `import.js` with the filename(s)
- Run `node import.js` to place the transactions into SQLite3
- Run `web.js`to launch the web interface
