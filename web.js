const { readFileSync } = require('fs');
const parse = require('util').promisify(require('csv-parse'));

const express = require('express');
const app = express();

const { dataColumns, dataYears, purchaserDepartments, purchaseTypes } = require('./common');
const numberColumns = ['year', 'amount', 'vendor_number'];
const getColumnValue = (column, rawValue) => numberColumns.includes(column) ? Number(rawValue) : rawValue;

var transactions = [];
parse(readFileSync('data/db.csv')).then((parsedTransactions) => {
  parsedTransactions.shift();
  transactions = parsedTransactions.map((data) => {
    return data.reduce((acc, value, i) => {
      acc[dataColumns[i]] = getColumnValue(dataColumns[i], value);
      return acc;
    }, {});
  });
});

app.set('views', './views');
app.set('view engine', 'ejs');
app.locals.wrapComma = (number) => { return number.toLocaleString('en-US'); };
const filterColumns = app.locals.filterColumns = [ 'purchaser_department', 'vendor_number', 'type', 'year'];

function isSequential(array) {
  return array.every((a, i, aa) => {
    return !i || (aa[i - 1] + 1 === a);
  });
}
app.locals.yearDisplay = (years) => {
  if (years.length === 1) {
    return years[0];
  } else if (years.length === 2) {
    return `${years[0]} and ${years[1]}`;
  }  else if (isSequential(years)) {
    return `${years[0]}-${years[years.length - 1]}`;
  } else {
    return `${years.slice(0, years.length - 2).join(', ')} and ${years[years.length - 1]}`;
  }
};

const getApplicableTransactions = (query, queryParametersToIgnore = []) => {
  var applicableTransactions = transactions;

  filterColumns.filter((filterColumn) => {
    return !queryParametersToIgnore.includes(`${filterColumn}s`) && query[`${filterColumn}s`];
  })
  .forEach((filterColumn) => {
    const selectValue = query[`${filterColumn}s`].map((sv) => { return getColumnValue(filterColumn, sv); });
    applicableTransactions = applicableTransactions.filter((t) => {
      return selectValue.includes(getColumnValue(filterColumn, t[filterColumn]));
    });
  });

  return applicableTransactions;
};

app.get('/', (req, res) => {
  const vendorsByNumber = getApplicableTransactions(req.query, ['vendor_numbers'])
  .reduce((acc, x) => {
    (acc[x.vendor_number] = acc[x.vendor_number] || []).push(x);
    return acc;
  }, {});
  const vendors = Object.keys(vendorsByNumber).map((vendorNumber) => {
    return vendorsByNumber[vendorNumber][0];
  });

  var applicableTransactions = getApplicableTransactions(req.query);
  var tooManyResults = false;
  var emptyQuery = Object.keys(req.query).length === 0;

  if (emptyQuery) {
    const moneySorter = (a, b) => b.amount - a.amount;
    years = [2018];
    applicableTransactions = applicableTransactions.filter((t) => t.year === 2018).sort(moneySorter);
  } else if (applicableTransactions.length > 500) {
    tooManyResults = true;
  }

  var years = [2014, 2015, 2016, 2017, 2018];
  if (req.query.years) {
    years = req.query.years.map(Number).sort();
  }

  res.render('index', {
    dataYears,
    transactions: applicableTransactions,
    purchaserDepartments,
    purchaseTypes: Object.values(purchaseTypes),
    emptyQuery,
    tooManyResults,
    vendors,
    years,
  });
});

app.listen(process.env.PORT || 3000);
