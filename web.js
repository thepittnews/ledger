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
  { filterName: 'vendor_numbers', filterColumn: 'vendor_number' },
  { filterName: 'years', filterColumn: 'year' }
];

const getApplicableTransactions = (query, queryParametersToIgnore = []) => {
  var applicableTransactions = transactions;
  filters.filter(({ filterName }) => { return !queryParametersToIgnore.includes(filterName); })
  .forEach(({ filterName, filterColumn }) => {
    if (query[filterName]) {
      var selectValue = query[filterName];
      if (!Array.isArray(selectValue)) {
        selectValue = [selectValue];
      }

      if (filterName === 'years' || filterName === 'vendor_numbers') {
        selectValue = selectValue.map((sv) => { return Number(sv); });
      }

      applicableTransactions = applicableTransactions.filter((t) => {
        return selectValue.includes(t[filterColumn]);
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
