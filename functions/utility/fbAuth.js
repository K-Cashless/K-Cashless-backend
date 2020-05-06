const { admin, db } = require("./admin");

module.exports = (req, res, next) => {
  let idToken;
  let checkUser = false;
  let checkMerchant = false;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    checkUser = true;
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Merchant ")
  ) {
    checkMerchant = true;
    idToken = req.headers.authorization.split("Merchant ")[1];
  } 
  else if( req.headers.authorization &&
    req.headers.authorization.startsWith("Admin "))
    {
      checkAdmin = true;
      idToken = req.headers.authorization.split("Admin ")[1];
    } 
    else {
    console.error("No token found");
    return res.status(403).json({ error: "Unauthorized" });
  }

  if(checkUser === true)
  {
    console.log('idToken'+idToken);
    admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      req.user = decodedToken;
      return db
        .collection("users")
        .where("userId", "==", req.user.uid)
        .limit(1)
        .get();
    })
    .then((data) => {
      req.user.handle = data.docs[0].data().handle;
      req.user.firstName = data.docs[0].data().firstName;
      req.user.lastName = data.docs[0].data().lastName;
      req.user.imageUrl = data.docs[0].data().imageUrl;
      req.user.device = data.docs[0].data().device;
      return next();
    })
    .catch((err) => {
      console.error("Error while verifying token or It's not user", err);
      return res.status(403).json(err);
    });
  }
  else if(checkMerchant === true)
  {
    console.log('idToken'+idToken);
    
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
      return res.status(403).json(err);
    });
  }
  else if(checkAdmin === true)
  {
    admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      req.admin = decodedToken;
      return db
        .collection("admins")
        .where("userId", "==", req.admin.uid)
        .limit(1)
        .get();
    })
    .then((data) => {
      req.admin.handle = data.docs[0].data().handle;
      
      return next();
    })
    .catch((err) => {
      console.error("Error while verifying token or It's not admin", err);
      return res.status(403).json(err);
    });
  }
};
