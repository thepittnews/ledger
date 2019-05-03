const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('db.sqlite3');
const express = require('express');
const app = express();
const { purchaserDepartments } = require('./common');

var transactions = [];
db.serialize(() => {
  db.all('SELECT * from ledger_transaction', (err, rows) => {
    if (err) throw err;
    transactions = rows;
  });
});
db.close();

app.set('views', './views');
app.set('view engine', 'ejs');
app.locals.wrapComma = (number) => { return number.toLocaleString('en-US'); }
const filters = app.locals.filters = [
  { filterName: 'purchaserDepartments', filterColumn: 'purchaser_department' },
  { filterName: 'years', filterColumn: 'year' }
];

app.get('/', (req, res) => {
  var applicableTransactions = transactions;
  filters.forEach(({ filterName, filterColumn }) => {
    if (req.query[filterName]) {
      var selectValue = req.query[filterName];
      if (!Array.isArray(selectValue)) {
        selectValue = [selectValue];
      }

      if (filterName === 'years') {
        selectValue = selectValue.map((sv) => { return Number(sv); });
      }

      applicableTransactions = applicableTransactions.filter((t) => {
        return selectValue.includes(t[filterColumn]);
      });
    }
  });

  res.render('index', { transactions: applicableTransactions, purchaserDepartments });
});

app.listen(3000);
