const { readFileSync } = require('fs');
const parse = require('util').promisify(require('csv-parse'));

const express = require('express');
const app = express();

const { dataColumns, dataYears, purchaserDepartments, purchaseTypes } = require('./common');

var transactions = [];
parse(readFileSync('data/db.csv')).then((parsedTransactions) => {
  parsedTransactions.shift();

  for(const data of parsedTransactions) {
    var obj = {};
    for(var i = 0; i < data.length; i++) {
      const column = dataColumns[i];
      if (['year', 'amount', 'vendor_number'].includes(column)) {
        obj[column] = Number(data[i]);
      } else {
        obj[column] = data[i];
      }
    }

    transactions.push(obj);
  }
});

app.set('views', './views');
app.set('view engine', 'ejs');
app.locals.wrapComma = (number) => { return number.toLocaleString('en-US'); };
const filters = app.locals.filters = [
  { name: 'purchaserDepartments', column: 'purchaser_department' },
  { name: 'vendor_numbers', column: 'vendor_number' },
  { name: 'purchase_types', column: 'type' },
  { name: 'years', column: 'year' }
];

const getApplicableTransactions = (query, queryParametersToIgnore = []) => {
  var applicableTransactions = transactions;
  filters.filter(({ name }) => { return !queryParametersToIgnore.includes(name); })
  .forEach(({ name, column }) => {
    if (!query[name]) return;

    var selectValue = query[name];
    if (!Array.isArray(selectValue)) {
      selectValue = [selectValue];
    }

    if (name === 'years' || name === 'vendor_numbers') {
      selectValue = selectValue.map((sv) => { return Number(sv); });
    }

    applicableTransactions = applicableTransactions.filter((t) => {
      var transactionValue = t[column];
      if (name === 'years' || name === 'vendor_numbers') {
        transactionValue = Number(transactionValue);
      }

      return selectValue.includes(transactionValue);
    });
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

  const applicableTransactions = getApplicableTransactions(req.query);
  var tooManyResults = false;
  if (applicableTransactions.length > 500) {
    tooManyResults = true;
  }

  res.render('index', {
    dataYears,
    transactions: applicableTransactions,
    purchaserDepartments,
    purchaseTypes: Object.values(purchaseTypes),
    tooManyResults,
    vendors
  });
});

app.listen(process.env.PORT || 3000);
