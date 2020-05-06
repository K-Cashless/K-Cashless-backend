const { admin, db } = require("../utility/admin");

const config = require("../utility/config.js");
const { uuid } = require("uuidv4");
const axios = require("axios");
const cors = require("cors")({ origin: true });
const firebase = require("firebase");
firebase.initializeApp(config);

const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
} = require("../utility/validators");

exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phone: req.body.phone,
  };

  const { valid, errors } = validateSignupData(newUser);

  if (!valid) return res.status(400).json(errors);

  const noImg = "no-img.jpg";

  let token, userId;
  db.doc("/users/" + newUser.handle)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res
          .status(400)
          .json({ message: "This handle is already taken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
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
        handle: newUser.handle,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phone: newUser.phone,
        deposit: 0,
        point: 0,
        createdAt: new Date().toISOString(),
        imageUrl:
          "https://firebasestorage.googleapis.com/v0/b/" +
          config.storageBucket +
          "/o/" +
          noImg +
          "?alt=media",
        device: "",
        userId,
      };
      return db.doc("/users/" + newUser.handle).set(userCredentials);
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

exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };
  const { valid, errors } = validateLoginData(user);

  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
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
//logout
exports.logout = (req, res) => {
  firebase
    .auth()
    .signOut()
    .then(() => {
      return res.json({ message: "Sign-out successful" });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
//Get user Data
exports.getUserData = (req, res) => {
  let userData = [];
  console.log("lol" + req.user.handle);

  db.doc(`/users/${req.user.handle}`)
    .get()
    .then((doc) => {
      userData.push({
        userId: doc.id,
        handle: doc.data().handle,
        email: doc.data().email,
        firstName: doc.data().firstName,
        lastName: doc.data().lastName,
        phone: doc.data().phone,
        deposit: doc.data().deposit,
        point: doc.data().point,
        imageUrl: doc.data().imageUrl,
        createdAt: doc.data().createdAt,
      });
      console.log(userData);
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
//Get All user
exports.getAllUserData = (req, res) => {
  let userData = [];
  db.collection("users")
    .get()
    .then((data) => {
      data.forEach((doc) => {
        userData.push({
          userId: doc.id,
          handle: doc.data().handle,
          email: doc.data().email,
          firstName: doc.data().firstName,
          lastName: doc.data().lastName,
          phone: doc.data().phone,
          deposit: doc.data().deposit,
          point: doc.data().point,
          imageUrl: doc.data().imageUrl,
          createdAt: doc.data().createdAt,
        });
      });
      console.log(userData);

      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

//Add user Detail
exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);

  db.doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() => {
      return res.json({ message: "Details added successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
exports.updateUserDetails = (req, res) => {
  const userDetails = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phone: req.body.phone,
  };

  db.doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() => {
      return res.json({ message: "Details added successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};
  db.doc("/users/" + req.user.handle)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection("likes")
          .where("userHandle", "==", req.user.handle)
          .get();
      }
    })
    .then((data) => {
      userData.likes = [];
      data.forEach((doc) => {
        userData.like.push(doc.data());
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
//Forget password
exports.resetPass = (req, res) => {
  let userEmail = {
    email: req.body.email,
  };
  firebase
    .auth()
    .sendPasswordResetEmail(userEmail.email)
    .then(() => {
      return res.json({ message: "Password reset sent" });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};

// Upload a profile image for user
exports.uploadUserImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageToBeUploaded = {};
  let imageFileName;
  // String for image token
  let generatedToken = uuid();

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    console.log(fieldname, file, filename, encoding, mimetype);
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Wrong file type submitted" });
    }
    // my.image.png => ['my', 'image', 'png']
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    // 32756238461724837.png
    imageFileName = `${Math.round(
      Math.random() * 1000000000000
    ).toString()}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
            //Generate token to be appended to imageUrl
            firebaseStorageDownloadTokens: generatedToken,
          },
        },
      })
      .then(() => {
        // Append token to url
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media&token=${generatedToken}`;
        return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
      })
      .then(() => {
        return res.json({ message: "image uploaded successfully" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: "something went wrong" });
      });
  });
  busboy.end(req.rawBody);
};
//Top-Up Done
exports.topup = (req, res) => {
  const prepaidCard = {
    number: req.body.number,
    value: req.body.value,
  };
  db.doc(`/prepaidCard/${req.params.cardID}`)
    .get()
    .then((doc) => {
      console.log(doc.data().number);
      console.log(req.params.cardID);
      if (!doc.exists) {
        return res.status(404).json({ error: "Wrong CardID" });
      } else if (
        prepaidCard.value !== doc.data().value ||
        prepaidCard.number !== doc.data().number
      ) {
        return res.status(500).json({ error: "Wrong value or number of card" });
      } else if (doc.data().used === true) {
        return res.status(500).json({ error: "This card is already use" });
      } else {
        db.doc(`/prepaidCard/${req.params.cardID}`)
          .get()
          .then(() => {
            const used = false;
            return db.doc(`/prepaidCard/${req.params.cardID}`).update({ used });
          })
          .then(() => {
            const whoUsed = req.user.handle;
            return db
              .doc(`/prepaidCard/${req.params.cardID}`)
              .update({ whoUsed });
          })
          .then(() => {
            db.doc(`/users/${req.user.handle}`)
              .get()
              .then((doc) => {
                console.log("tester " + doc.data().deposit);
                const deposit =
                  Number(doc.data().deposit) + Number(prepaidCard.value);
                return db.doc(`/users/${req.user.handle}`).update({ deposit });
              });
          })
          .then(() => {
            const transaction = {
              createdAt: new Date().toISOString(),
              from: req.params.cardID,
              to: req.user.handle,
              amount: prepaidCard.value,
              info: "Top-Up Money",
            };
            return db
              .doc(`/transactions/${transaction.createdAt}`)
              .set(transaction);
          })
          .then((data) => {
            console.log("done");
            return res.json({ message: "Top-Up Successful" });
          })
          .catch((err) => {
            console.error(err);
            res.status(500).json({ error: err.code });
          });
      }
    })

    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
//
exports.transfer = (req, res) => {
  let check = true;
  const merchant = {
    cost: req.body.cost,
  };
  db.doc(`/merchants/${req.params.merchantID}`)
    .get()
    .then((doc) => {
      console.log("num store " + req.params.merchantID);
      if (!doc.exists) {
        check = false;
        return res.status(404).json({ error: "Wrong MerchantID" });
      }
    })

    .then(() => {
      db.doc(`/users/${req.user.handle}`)
        .get()
        .then((doc) => {
          if (Number(doc.data().deposit) < Number(merchant.cost)) {
            return res.status(404).json({ err: "Deposit less than cost" });
          } else {
            console.log("tester " + doc.data().deposit);

            const deposit = Number(doc.data().deposit) - Number(merchant.cost);
            const point = Number(doc.data().point) + Number(merchant.cost);
            return db
              .doc(`/users/${req.user.handle}`)
              .update({ deposit, point });
          }
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: err.code });
        });
    })
    .then(() => {
      db.doc(`/users/${req.user.handle}`)
        .get()
        .then((doc) => {
          if (Number(doc.data().deposit) < Number(merchant.cost)) {
            return res.status(404).json({ err: "Deposit less than cost" });
          }
          db.doc(`/merchants/${req.params.merchantID}`)
            .get()
            .then((doc) => {
              const total = Number(doc.data().total) + Number(merchant.cost);
              console.log(total);

              return db
                .doc(`/merchants/${req.params.merchantID}`)
                .update({ total });
            })
            .catch((err) => {
              console.error(err);
              return res.status(500).json({ error: err.code });
            });
        });
    })
    .then((doc) => {
      if (check === true) {
        db.doc(`/users/${req.user.handle}`)
          .get()
          .then((doc) => {
            if (Number(doc.data().deposit) < Number(merchant.cost)) {
              return res.status(404).json({ err: "Deposit less than cost" });
            } else {
              const transaction = {
                createdAt: new Date().toISOString(),
                from: req.user.handle,
                to: req.params.merchantID,
                amount: merchant.cost,
                info: "Paid Merchant",
              };
              db.doc(`/transactions/${transaction.createdAt}`)
                .set(transaction)
                .then(() => {
                  db.doc(`merchants/${req.params.merchantID}`)
                    .get()
                    .then((doc) => {
                      axios
                        .post("https://exp.host/--/api/v2/push/send", {
                          to: doc.data().device,
                          sound: "default",
                          //title -> transaction.info
                          //body -> transaction.amount
                          titile: "It Marks",
                          body: "Paid Merchant",
                          data: {
                            title: "Paid Merchant",
                            body: Math.random().toString() + "THB",
                          },
                        })
                        .then((res) => {
                          console.log(res);
                          console.log("device is" + doc.data().device);
                        })
                        .catch((err) => {
                          console.log(err);
                        });
                    })
                    .catch((err) => {
                      console.log(err);
                    });
                })
                .then(() => {
                  return res.json({ transaction });
                })
                .catch((err) => {
                  console.log(err);
                });
            }
          })
          .catch((err) => {
            console.error(err);
            return res.status(500).json({ error: err.code });
          });
      }
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
//Redeem Done
exports.redeemPoint = (req, res) => {
  let tempDeposit;
  let tempMoney;
  let tempPoint;
  let check = false;
  db.doc(`/users/${req.user.handle}`)
    .get()
    .then((doc) => {
      if (Number(doc.data().point) >= 200) {
        console.log("ss");

        tempPoint = Number(doc.data().point);
        tempDeposit = Number(doc.data().deposit);
        tempMoney = tempPoint / 200;
        tempPoint = tempPoint - 200 * parseInt(tempMoney);
        tempDeposit = tempDeposit + parseInt(tempMoney);
        const updatePoint = {
          point: tempPoint,
          deposit: tempDeposit,
        };
        console.log("point" + updatePoint.point);
        console.log("deposit" + updatePoint.deposit);
        check = true;
        return db.doc(`/users/${req.user.handle}`).update(updatePoint);
      } else return res.status(404).json({ err: "Point less than 200" });
    })
    .then((doc) => {
      if (check === true) {
        console.log("check" + check);
        console.log("token" + req.user.device);
        const transaction = {
          createdAt: new Date().toISOString(),
          from: req.user.handle,
          to: req.user.handle,
          amount: parseInt(tempMoney),
          info: "Redeem Point",
        };
        db.doc(`/transactions/${transaction.createdAt}`)
          .set(transaction)
          .then(() => {
            cors(req, res, () => {
              if (req.method !== "POST") {
                return res.status(401).json({
                  message: "Not allowed",
                });
              }
              return axios
                .post("https://exp.host/--/api/v2/push/send", {
                  to: req.user.device,
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
            });
          })
          .then(() => {
            return res.json({ transaction });
          })
          .catch((err) => {
            console.error(err);
            return res.status(500).json({ error: err.code });
          });
      }
    })

    .catch((err) => {
      console.log("ee");
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.userGetMerchant = (req, res) => {
  let merchantData = [];
  db.doc(`/merchants/${req.params.merchantID}`)
    .get()
    .then((doc) => {
      merchantData.push({
        handle: doc.data().handle,
        storeName: doc.data().storeName,
        ownerName: doc.data().ownerName,
        phone: doc.data().phone,
        imageUrl: doc.data().imageUrl,
      });
      console.log(merchantData);
      return res.json(merchantData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.pushUserDeviceToken = (req, res) => {
  const tokenDevice = {
    device: req.body.device,
  };
  db.doc(`/users/${req.user.handle}`)
    .update(tokenDevice)
    .then(() => {
      return res.json({ message: "push token successful" });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
