const { readFileSync, writeFileSync } = require('fs');
const parse = require('util').promisify(require('csv-parse'));

const {
  dataColumns,
  dataYears,
  purchaserDepartments,
  purchaserDepartmentAliases,
  purchaseTypes
} = require('./common');

var processedData = [];
processedData.push(dataColumns);

dataYears.forEach((dataYear, i) => {
  parse(readFileSync(`data/FY${dataYear.toString().slice(-2)}_contracts.csv`)).then((transactions) => {
    // Remove headers and footers
    transactions.shift();
    if ([2014, 2017, 2018].includes(dataYear)) { transactions.pop(); }
    if ([2017, 2018].includes(dataYear)) { transactions.pop(); }

    transactions.forEach((transaction, i2) => {
      const vendorAddress = `${transaction[5]}\n${transaction[6]}${transaction[6] ? "\n" : ""}${transaction[7]}, ${transaction[8]} ${transaction[9]}`;

      const purchaseType = purchaseTypes[Number(transaction[2])];
      if (purchaseType === undefined) {
        console.log(transaction[2]);
      }

      var purchaserDepartment = undefined;
      const rawPurchaserDepartment = transaction[1].trim();
      if (purchaserDepartments.includes(rawPurchaserDepartment)) {
        purchaserDepartment = rawPurchaserDepartment;
      } else if (Object.keys(purchaserDepartmentAliases).includes(rawPurchaserDepartment)) {
        purchaserDepartment = purchaserDepartmentAliases[rawPurchaserDepartment];
      }
      if (purchaserDepartment === undefined) {
        console.log(transaction[1]);
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
