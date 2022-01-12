const { readFileSync, writeFileSync } = require('fs');
const parse = require('util').promisify(require('csv-parse'));

const {
  dataColumns,
  dataYears,
  purchaserDepartments,
  purchaseTypes
} = require('./common');

var processedData = [dataColumns];

dataYears.forEach((dataYear, i) => {
  parse(readFileSync(`data/FY${dataYear.toString().slice(-2)}_contracts.csv`)).then((transactions) => {
    // Remove headers and footers
    transactions.shift();
    if ([2014, 2017, 2018, 2020, 2021].includes(dataYear)) { transactions.pop(); }
    if ([2017, 2018].includes(dataYear)) { transactions.pop(); }

    transactions.forEach((transaction, i2) => {
      const vendorAddress = `${transaction[5]}\n${transaction[6]}${transaction[6] ? "\n" : ""}${transaction[7]}, ${transaction[8]} ${transaction[9]}`;

      const purchaseType = purchaseTypes[Number(transaction[2])];
      if (purchaseType === undefined) {
        console.log(transaction[2]);
      }

      const purchaserDepartment = purchaserDepartments[Number(transaction[0])];
      if (purchaserDepartment === undefined) {
        console.log(`Can't find purchaser department: ${transaction[1]}`);
      }

      if (dataYears.indexOf(dataYear) === dataYears.length - 1 && purchaserDepartment != transaction[1]) {
        console.log(`Possible rename of purchaser department ${transaction[0]}: ${transaction[1]}`);
      }

      processedData.push([
        dataYear,
        parseFloat(transaction[10].replace(/,/g, '')),
        Number(transaction[3]),
        `"${transaction[4]}"`,
        `"${vendorAddress}"`,
        `"${purchaserDepartment}"`,
        `"${purchaseType}"`
      ]);

      if (i2 === transactions.length - 1 && i === dataYears.length - 1) {
        writeFileSync('data/db.csv', processedData.map((pd) => { return pd.join(','); }).join("\n"));
      }
    });
  });
});
