const { readFileSync } = require('fs');
const parse = require('util').promisify(require('csv-parse'));
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('db.sqlite3');

const { purchaserDepartments, purchaserDepartmentAliases, purchaseTypes } = require('./common');
const dataYears = [ 2014, 2016, 2017, 2018];

db.serialize(() => {
  //db.exec(
    //`CREATE TABLE "ledger_transaction" (
    //"id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
    //"year" integer NOT NULL,
    //"amount" integer NOT NULL,
    //"vendor_number" integer NOT NULL,
    //"vendor_name" varchar(200) NOT NULL,
    //"vendor_address" varchar(200) NOT NULL,
    //"purchaser_department" varchar(200),
    //"purchase_type" varchar(200) NOT NULL)`
  //);

  dataYears.forEach((dataYear, i) => {
    let data = readFileSync(`FY${dataYear.toString().slice(-2)}_contracts.csv`);
    parse(data).then((transactions) => {
      // Remove headers and footers
      transactions.shift();
      if ([2014, 2017, 2018].includes(dataYear)) {
        transactions.pop();
      }
      if ([2017, 2018].includes(dataYear)) {
        transactions.pop();
      }

      transactions.forEach((transaction, i2) => {
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

        const vendorAddress = `${transaction[5]}\n${transaction[6]}${transaction[6] ? "\n" : "" }${transaction[7]}, ${transaction[8]} ${transaction[9]}`;
        const insertValues = [
          dataYear,
          parseFloat(transaction[10].replace(/,/g, '')),
          Number(transaction[3]),
          `"${transaction[4]}"`,
          `"${vendorAddress}"`,
          `"${purchaserDepartment}"`,
          `"${purchaseType}"`
        ].join(', ');

        db.exec(
          `INSERT INTO ledger_transaction
          (year, amount, vendor_number, vendor_name, vendor_address, purchaser_department, purchase_type)
          VALUES(${insertValues});`
        , (err) => { if (err) throw err; });

        if (i2 === transactions.length && i === datafiles.length) {
          db.close();
        }
      });
    });
  });
});
