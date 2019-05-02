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

app.get('/', (req, res) => {
  var applicableTransactions = transactions;
  if (req.query.purchaserDepartments) {
    var pds = req.query.purchaserDepartments;
    if (!Array.isArray(pds)) {
      pds = [pds];
    }

    applicableTransactions = applicableTransactions.filter((t) => {
      return pds.includes(t.purchaser_department);
    });
  }

  res.render('index', { transactions: applicableTransactions, purchaserDepartments });
});

app.listen(3000);
