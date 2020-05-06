const { admin, db } = require("../utility/admin");

const config = require("../utility/config.js");

const firebase = require("firebase");

//Get All transactions
exports.getAllTransactions = (req, res) => {
  let transactionData = [];
  db.collection("transactions")
    .get()
    .then((data) => {
      data.forEach((doc) => {
        transactionData.push({
          createdAt: doc.data().createdAt,
          from: doc.data().from,
          to: doc.data().to,
          amount: doc.data().amount,
        });
      });
      console.log(transactionData);

      return res.json(transactionData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
exports.getOneUserTransaction = (req, res) => {
  db.collection("transactions")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let userData = [];
      data.forEach((doc) => {
        if (doc.data().from === req.user.handle || (doc.data().to === req.user.handle && doc.data().info === "Top-Up Money")) {
          userData.push({
            createdAt: doc.data().createdAt,
            from: doc.data().from,
            to: doc.data().to,
            amount: doc.data().amount,
            info: doc.data().info,
          });
        }
      });
      console.log(userData);

      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.getOneMerchantTransaction = (req, res) => {
  db.collection("transactions")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let merchantData = [];
      data.forEach((doc) => {
        console.log('log'+req.merchant.handle);
        
        if (doc.data().to === req.merchant.handle) {
          merchantData.push({
            createdAt: doc.data().createdAt,
            from: doc.data().from,
            to: doc.data().to,
            amount: doc.data().amount,
            info: doc.data().info,
          });
        }
      });
      console.log(merchantData);

      return res.json(merchantData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
