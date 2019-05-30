const { readFileSync } = require('fs');
const parse = require('util').promisify(require('csv-parse'));

const express = require('express');
const app = express();

const { dataColumns, dataYears, purchaserDepartments, purchaseTypes } = require('./common');
const numberColumns = ['year', 'amount', 'vendor_number'];

var transactions = [];
parse(readFileSync('data/db.csv')).then((parsedTransactions) => {
  parsedTransactions.shift();

  for(const data of parsedTransactions) {
    var obj = {};
    for(var i = 0; i < data.length; i++) {
      const column = dataColumns[i];
      if (numberColumns.includes(column)) {
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
const filterColumns = app.locals.filterColumns = [ 'purchaser_department', 'vendor_number', 'type', 'year'];

const getApplicableTransactions = (query, queryParametersToIgnore = []) => {
  var applicableTransactions = transactions;

  filterColumns.filter((filterColumn) => {
    return !queryParametersToIgnore.includes(`${filterColumn}s`) && query[`${filterColumn}s`];
  })
  .forEach((filterColumn) => {
    var selectValue;

    if (numberColumns.includes(filterColumn)) {
      selectValue = query[`${filterColumn}s`].map((sv) => { return Number(sv); });
    } else {
      selectValue = query[`${filterColumn}s`];
    }

    applicableTransactions = applicableTransactions.filter((t) => {
      if (numberColumns.includes(filterColumn)) {
        return selectValue.includes(Number(t[filterColumn]));
      } else {
        return selectValue.includes(t[filterColumn]);
      }
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
    return vendorsByNumber[vendorNumber][0];
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
