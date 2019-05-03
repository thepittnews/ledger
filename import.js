const { readFileSync } = require('fs');
const pdf = require('pdf-parse');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('db.sqlite3');
const { purchaserDepartments, purchaseTypes } = require('./common');

db.serialize(() => {
  db.exec(
    `CREATE TABLE "ledger_transaction" (
    "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
    "year" integer NOT NULL,
    "amount" integer NOT NULL,
    "vendor_number" integer NOT NULL,
    "vendor_name" varchar(200) NOT NULL,
    "vendor_address" varchar(200) NOT NULL,
    "purchaser_department" varchar(200), "purchase_type" varchar(200) NOT NULL)`
  );

  for(const datafile of [{ year: 2015, filename: '2015_For_Reader' }]) {
    let dataBuffer = readFileSync(`${datafile.filename}.pdf`);
    pdf(dataBuffer).then((data) => {
      pages = data.text.split(`\n\nUniversity of Pittsburgh\nFiscal Year ${datafile.year} Goods and Services Expenditures\n`);
      pages.slice(1, pages.length).forEach((pageText) => {
        const splitText = pageText.split(/Vendor Number:\n?(\d*)\$(\S*)\n/);

        // Remove page number
        splitText.splice(-1);

        const splitFirstRow = splitText[0].split("\n");
        var purchaserDepartment = splitFirstRow[0];
        var purchaseType = splitFirstRow[1];
        splitText[0] = splitFirstRow.slice(2, splitFirstRow.length).join("\n");

        for(var i = 0; i < splitText.length; i += 3) {
          var vendorInformation = splitText[i].split("\n");

          if (splitText[i].includes('Total for')) {
            vendorInformation = vendorInformation.splice(1, vendorInformation.length);
          }

          if (purchaserDepartments.includes(vendorInformation[0])) {
            purchaserDepartment = vendorInformation.shift();
          }

          if (purchaseTypes.includes(vendorInformation[0])) {
            purchaseType = vendorInformation.shift();
          }

          const vendorName = vendorInformation[0];
          const vendorAddress = vendorInformation.slice(0, vendorInformation.length).map((a) => { return a.trim().trim(); }).filter((a) => { return !!a; }).join(", ")
          const vendorNumber = splitText[i + 1];
          const amount = splitText[i + 2];

          db.exec(
            `INSERT INTO ledger_transaction
            (year, amount, vendor_number, vendor_name, vendor_address, purchaser_department, purchase_type)
            VALUES(${datafile.year},${parseFloat(amount.replace(/,/g, ''))},${Number(vendorNumber)},"${vendorName}","${vendorAddress}","${purchaserDepartment}","${purchaseType}");`
          , (err) => { if (err) throw err;});
      }
    });
  });
}
});

db.close();
