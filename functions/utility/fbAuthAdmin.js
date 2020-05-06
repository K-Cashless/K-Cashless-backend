const { admin, db } = require("./admin");

module.exports = (req, res, next) => {
  let idToken;
  let checkAdmin = false;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Admin ")
  ) {
    checkAdmin = true;
    idToken = req.headers.authorization.split("Admin ")[1];
  } else {
    console.error("No token found");
    return res.status(403).json({ error: "Unauthorized" });
  }
  if (checkAdmin === true) {
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
        return res.status(403).json({err:"Error while verifying token or It's not Admin"});
      });
  }
};
