const { admin, db } = require("./admin");

module.exports = (req, res, next) => {
  let idToken;
  let checkMerchant = false;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Merchant ")
  ) {
    checkMerchant = true;
    idToken = req.headers.authorization.split("Merchant ")[1];
  } else {
    console.log(req.headers.authorization);
    console.error("No token found");
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (checkMerchant === true) {
    admin
      .auth()
      .verifyIdToken(idToken)
      .then((decodedToken) => {
        req.merchant = decodedToken;
        return db
          .collection("merchants")
          .where("userId", "==", req.merchant.uid)
          .limit(1)
          .get();
      })
      .then((data) => {
        req.merchant.handle = data.docs[0].data().handle;
        req.merchant.storeName = data.docs[0].data().storeName;

        return next();
      })
      .catch((err) => {
        console.error("Error while verifying token or It's not merchant", err);
        return res.status(403).json({err:"Error while verifying token"});
      });
  }
};
