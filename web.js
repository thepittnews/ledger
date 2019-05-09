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
  { name: 'purchaserDepartments', column: 'purchaser_department' },
  { name: 'vendor_numbers', column: 'vendor_number' },
  { name: 'years', column: 'year' }
];

const getApplicableTransactions = (query, queryParametersToIgnore = []) => {
  var applicableTransactions = transactions;
  filters.filter(({ name }) => { return !queryParametersToIgnore.includes(name); })
  .forEach(({ name, column }) => {
    if (query[name]) {
      var selectValue = query[name];
      if (!Array.isArray(selectValue)) {
        selectValue = [selectValue];
      }

      if (name === 'years' || name === 'vendor_numbers') {
        selectValue = selectValue.map((sv) => { return Number(sv); });
      }

      applicableTransactions = applicableTransactions.filter((t) => {
        return selectValue.includes(t[column]);
      });
    }
  });

  return applicableTransactions;
};

app.get('/', (req, res) => {
  const vendorsByNumber = getApplicableTransactions(req.query, ['vendor_numbers'])
  .map((t) => {
    return { name: t.vendor_name, number: t.vendor_number, year: t.year };
  })
  .reduce((rv, x) => {
    (rv[x.number] = rv[x.number] || []).push(x);
    return rv;
  }, {});
  const vendors = Object.keys(vendorsByNumber).map((vendorNumber) => {
    return vendorsByNumber[vendorNumber].sort((a, b) => { return a.year - b.year })[0];
  });

  res.render('index', {
    transactions: getApplicableTransactions(req.query),
    purchaserDepartments,
    vendors
  });
});

app.listen(3000);
