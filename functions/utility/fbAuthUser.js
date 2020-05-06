const { admin, db } = require("./admin");

module.exports = (req, res, next) => {
  let idToken;
  let checkUser = false;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    checkUser = true;
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    console.error("No token found");
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (checkUser === true) {
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
        return res.status(403).json({err:"Error while verifying token or It's not user"});
      });
  }
};
