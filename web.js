const { readFileSync } = require('fs');
const parse = require('util').promisify(require('csv-parse'));

const express = require('express');
const app = express();

const { dataColumns, dataYears, purchaserDepartments } = require('./common');

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

  var applicableTransactions = getApplicableTransactions(req.query);
  var displayWelcome = false;
  if (applicableTransactions.length === 30266) {
    applicableTransactions = [];
    displayWelcome = true;
  }

  res.render('index', {
    dataYears,
    displayWelcome,
    transactions: applicableTransactions,
    purchaserDepartments,
    vendors
  });
});

app.get('/change', (req, res) => {
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

  var mappedTransactions = [];
  var transactionsByVendorNumber = getApplicableTransactions(req.query)
  .reduce((rv, x) => {
    (rv[x.vendor_number] = rv[x.vendor_number] || []).push(x);
    return rv;
  }, {});
  Object.keys(transactionsByVendorNumber).forEach((vendorNumber) => {
    const transactionsByVendorNumberByDepartment = transactionsByVendorNumber[vendorNumber].reduce((rv, x) => {
      (rv[x.purchaser_department] = rv[x.purchaser_department] || []).push(x);
      return rv;
    }, {});

    Object.keys(transactionsByVendorNumberByDepartment).forEach((dept) => {
      const transactionsByVendorNumberByDepartmentAndType = transactionsByVendorNumberByDepartment[dept].reduce((rv, x) => {
        (rv[x.type] = rv[x.type] || []).push(x);
        return rv;
      }, {});

      Object.keys(transactionsByVendorNumberByDepartmentAndType).forEach((type) => {
        const transactions = transactionsByVendorNumberByDepartmentAndType[type].sort((a, b) => { return a.year - b.year });
        const mappedTransaction = Object.assign(
          {},
          transactions[transactions.length - 1],
          { amount: 100 * ((transactions[transactions.length - 1].amount - transactions[0].amount) / (transactions[0].amount)) }
        );

        mappedTransactions.push(mappedTransaction);
      });
    });
  });

  var displayWelcome = false;
  if (mappedTransactions.length === 14728) {
    mappedTransactions = [];
    displayWelcome = true;
  }

  res.render('change', {
    dataYears,
    displayWelcome,
    transactions: mappedTransactions,
    purchaserDepartments,
    vendors
  });
});

app.listen(3000);
