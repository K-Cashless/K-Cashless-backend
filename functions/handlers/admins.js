const { admin, db } = require("../utility/admin");

const config = require("../utility/config.js");
const axios = require("axios");
const firebase = require("firebase");

const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
} = require("../utility/validators");

exports.adminSignup = (req, res) => {
  const newAdmin = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
    firstName: req.body.firstName,
    lastName: req.body.firstName,
    phone: req.body.phone,
  };

  const { valid, errors } = validateSignupData(newAdmin);

  if (!valid) return res.status(400).json(errors);

  const noImg = "no-img.jpg";

  let token, userId;
  db.doc("/admins/" + newAdmin.handle)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res
          .status(400)
          .json({ message: "This handle is already taken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(
            newAdmin.email,
            newAdmin.password
          );
      }
    })
    .then((data) => {
      console.log("pass");

      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idtoken) => {
      token = idtoken;
      const userCredentials = {
        handle: newAdmin.handle,
        email: newAdmin.email,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        phone: newAdmin.phone,
        createdAt: new Date().toISOString(),
        imageUrl:
          "https://firebasestorage.googleapis.com/v0/b/" +
          config.storageBucket +
          "/o/" +
          noImg +
          "?alt=media",
        userId,
      };
      return db.doc("/admins/" + newAdmin.handle).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })

    .catch((err) => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(500).json({ email: "Email is already in use" });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
};

exports.adminLogin = (req, res) => {
  const admin = {
    email: req.body.email,
    password: req.body.password,
  };
  const { valid, errors } = validateLoginData(admin);
  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(admin.email, admin.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        return res
          .status(403)
          .json({ message: "Wrong credentials,please try again" });
      } else return res.status(500).json({ error: err.code });
    });
};
//Get Merchant Data
exports.getAdminData = (req, res) => {
  let adminData = [];
  db.doc(`/admins/${req.admin.handle}`)
    .get()
    .then((doc) => {
      console.log("mh" + req.admin.handle);

      adminData.push({
        userId: doc.id,
        handle: doc.data().handle,
        email: doc.data().email,
        firstName: doc.data().firstName,
        lastName: doc.data().lastName,
        phone: doc.data().phone,
        imageUrl: doc.data().imageUrl,
        createdAt: doc.data().createdAt,
      });
      console.log(adminData);
      return res.json(adminData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
//GetRequest
exports.getRequest = (req, res) => {
  let requestData = [];
  db.collection("requestToAdmins")
    .get()
    .then((data) => {
      data.forEach((doc) => {
        requestData.push({
          handle: doc.data().handle,
          amount: doc.data().amount,
          requestedAt: doc.data().requestedAt,
          status: doc.data().status,
          accept: doc.data().accept,
        });
      });
      console.log(requestData);

      return res.json(requestData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
//AcceptRequest
exports.acceptRequest = (req, res) => {
  const data = {
    handle: req.body.handle,
  };
  db.doc(`/requestToAdmins/${data.handle}`)
    .get()
    .then((doc) => {
      let temp = doc.data().amount;
      if (!doc.exists) {
        check = false;
        return res.status(404).json({ error: "Not Found" });
      } else if (
        doc.data().accept === false &&
        doc.data().status === "Pending"
      ) {
        db.doc(`/merchants/${data.handle}`)
          .get()
          .then((doc) => {
            const tempDevice = doc.data().device;
            const total = Number(doc.data().total) - temp;
            db.doc(`/merchants/${data.handle}`)
              .update({ total })
              .then((doc) => {
                const transaction = {
                  createdAt: new Date().toISOString(),
                  from: "admin",
                  to: data.handle,
                  amount: parseInt(temp),
                  info: "Accept request",
                };
                db.doc(`/transactions/${transaction.createdAt}`)
                  .set(transaction)
                  .then((doc) => {
                    axios
                      .post("https://exp.host/--/api/v2/push/send", {
                        to: tempDevice,
                        sound: "default",
                        //title -> transaction.info
                        //body -> transaction.amount
                        titile: "It Marks",
                        body: "Yes Mark",
                        data: {
                          title: "Redeem Point",
                          body: Math.random().toString() + "THB",
                        },
                      })
                      .then((res) => {
                        console.log(res);
                      })
                      .catch((err) => {
                        console.log(err);
                      });
                  })
                  .then(() => {
                    return res.json({ transaction });
                  })
                  .catch((err) => {
                    console.error(err);
                    return res.status(500).json({ error: err.code });
                  });
              });
          })
          .then((doc) => {
            const status = "Done";
            return db.doc(`/requestToAdmins/${data.handle}`).update({ status });
          })
          .then((doc) => {
            const accept = true;
            return db.doc(`/requestToAdmins/${data.handle}`).update({ accept });
          })

          .catch((err) => {
            console.error(err);
            res.status(500).json({ error: err.code });
          });
      } else {
        return res.json({
          error: "Accepted Already, Please Contract to Admin",
        });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
//Create Notification
/*
const messaging = firebase.messaging();
exports.createNotification = (req,res) => {
  messaging.requestPermission()
  .then(()=>{
    console.log('Have permission');
  })
  .catch((err) => {
    console.error(err);
    res.status(500).json({ error: err.code });
  });
}*/

//Create Promotion
exports.createPromotion = (req, res) => {
  const data = {
    header: req.body.header,
    description: req.body.description,
    duration: req.body.duration,
    createdAt: new Date().toISOString(),
  };
  db.doc(`/promotions/${data.header}`)
    .set(data)
    //send promotion
    .then(() => {
      return res.status(200).json({ message: "Created Successful" });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
//Get All Promotion
exports.getAllPromotions = (req, res) => {
  let promotionData = [];
  db.collection("promotions")
    .get()
    .then((data) => {
      data.forEach((doc) => {
        promotionData.push({
          header: doc.data().header,
          description: doc.data().description,
          duration: doc.data().duration,
          createdAt: doc.data().createdAt,
        });
      });
      console.log(promotionData);

      return res.json(promotionData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
//Generate card
exports.generatePrepaidCard = (req, res) => {
  const cardData = {
    value: Number(req.body.value),
    number: req.body.number,
    whoUsed: "None",
    used: false,
    createdAt: new Date().toISOString(),
  };
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < 20; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  console.log(result);
  db.doc(`/prepaidCard/${result}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res
          .status(500)
          .json({ error: "Has CardID Already,Please genarate agian" });
      } else
        db.doc(`/prepaidCard/${result}`)
          .set(cardData)
          .then((doc) => {
            return res.json({ message: "Generate Card Successful" });
          })
          .catch((err) => {
            console.error(err);
            res.status(500).json({ error: err.code });
          });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
//Get All Prepaid Card
exports.getAllPrepaidCard = (req, res) => {
  let prepaidData = [];
  db.collection("prepaidCard")
    .get()
    .then((data) => {
      data.forEach((doc) => {
        prepaidData.push({
          pincode: doc.id,
          value: doc.data().value,
          number: doc.data().number,
          whoUsed: doc.data().whoUsed,
          used: doc.data().used,
          createdAt: doc.data().createdAt,
        });
      });
      console.log(prepaidData);
      return res.json(prepaidData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
//Clear all Prepaid card
exports.deleteOnePrepaidCards = (req, res) => {
  db.doc(`/prepaidCard/${req.params.cardID}`)
    .delete()
    .then(() => {
      return res.json({ message: "Delete successful" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
//database = doc.id
//userId = data.user.uid
