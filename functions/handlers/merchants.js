const { admin, db } = require("../utility/admin");

const config = require("../utility/config.js");
const { uuid } = require("uuidv4");
const firebase = require("firebase");

const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
} = require("../utility/validators");

exports.merchantSignup = (req, res) => {
  let tempNum = 0;
  let numMerchantID = 0;
  db.collection("merchants")
    .get()
    .then((data) => {
      data.forEach((doc) => {
        if (Number(doc.id.split("M")[1]) >= tempNum) {
          tempNum = Number(doc.id.split("M")[1]);
        }
        console.log("tempN" + tempNum);
      });
      numMerchantID = tempNum;
      console.log("nummm" + numMerchantID);
      let result = "";
      numMerchantID = numMerchantID + 1;
      let lengthMerchantID = numMerchantID.toString().length;
      fixZero = 4;
      if (fixZero - lengthMerchantID < 0) {
        return res.json({ err: "Over form xxxx" });
      }
      for (var i = 0; i < fixZero - lengthMerchantID; i++) {
        result += "0";
      }
      strMerchant = "M" + result + numMerchantID;

      const newMerchant = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        //handle: req.body.handle,
        handle: strMerchant,
        storeName: req.body.storeName,
        ownerName: req.body.ownerName,
        phone: req.body.phone,
      };

      const { valid, errors } = validateSignupData(newMerchant);

      if (!valid) return res.status(400).json(errors);

      const noImg = "no-img.jpg";

      let token, userId;
      db.doc("/merchants/" + newMerchant.handle)
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
                newMerchant.email,
                newMerchant.password
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
            handle: newMerchant.handle,
            //handle: listMerchantID = listMerchantID + 1,
            email: newMerchant.email,
            storeName: newMerchant.storeName,
            ownerName: newMerchant.ownerName,
            phone: newMerchant.phone,
            total: 0,
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
          return db
            .doc("/merchants/" + newMerchant.handle)
            .set(userCredentials);
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
    });
};

exports.merchantLogin = (req, res) => {
  const merchant = {
    email: req.body.email,
    password: req.body.password,
  };
  const { valid, errors } = validateLoginData(merchant);
  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(merchant.email, merchant.password)
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
//Update Merchant data
exports.updateMerchantDetails = (req, res) => {
  const userDetails = {
    storeName: req.body.storeName,
    ownerName: req.body.ownerName,
    phone: req.body.phone,
  };

  db.doc(`/merchants/${req.merchant.handle}`)
    .update(userDetails)
    .then(() => {
      return res.json({ message: "Details added successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
//Upload Image
exports.uploadMerchantImage = (req, res) => {
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
        return db.doc(`/merchants/${req.merchant.handle}`).update({ imageUrl });
      })
      .then(() => {
        return res.json({ message: "image uploaded successfully" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: "Something went wrong" });
      });
  });
  busboy.end(req.rawBody);
};
//Get Merchant Data
exports.getMerchantData = (req, res) => {
  let merchantData = [];
  db.doc(`/merchants/${req.merchant.handle}`)
    .get()
    .then((doc) => {
      console.log("mh" + req.merchant.handle);

      merchantData.push({
        userId: doc.id,
        handle: doc.data().handle,
        email: doc.data().email,
        storeName: doc.data().storeName,
        ownerName: doc.data().ownerName,
        phone: doc.data().phone,
        total: doc.data().total,
        imageUrl: doc.data().imageUrl,
        createdAt: doc.data().createdAt,
      });
      console.log(merchantData);
      return res.json(merchantData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
//Get Merchant user
exports.getAllMerchantData = (req, res) => {
  let merchantData = [];
  db.collection("merchants")
    .get()
    .then((data) => {
      data.forEach((doc) => {
        merchantData.push({
          userId: doc.id,
          handle: doc.data().handle,
          email: doc.data().email,
          storeName: doc.data().storeName,
          ownerName: doc.data().ownerName,
          phone: doc.data().phone,
          total: doc.data().total,
          imageUrl: doc.data().imageUrl,
          createdAt: doc.data().createdAt,
        });
      });
      console.log(merchantData);

      return res.json(merchantData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
//MoneyRequest
exports.moneyRequest = (req, res) => {
  const request = {
    handle: req.merchant.handle,
    amount: req.body.amount,
  };
  db.doc(`/merchants/${req.merchant.handle}`)
    .get()
    .then((doc) => {
      const newRequest = {
        handle: request.handle,
        amount: request.amount,
        requestedAt: new Date().toISOString(),
        status: "Pending",
        accept: false,
        device: doc.data().device,
      };
      //console.log('mer'+req.merchant.handle);

      if (doc.data().total > request.amount) {
        db.doc("/requestToAdmins/" + req.merchant.handle)
          .get()
          .then((doc) => {
            if (!doc.exists) {
              db.doc("/requestToAdmins/" + req.merchant.handle)
                .set(newRequest)
                .then(() => {
                  return res.json({ message: "Request Successful" });
                })
                .catch((err) => {
                  console.error(err);
                  res.status(500).json({ error: err.code });
                });
            } else if (
              doc.data().accept === false &&
              doc.data().status === "Pending"
            ) {
              return res
                .status(400)
                .json({ message: "Your request is on pending" });
            } else {
              db.doc("/requestToAdmins/" + req.merchant.handle)
                .set(newRequest)
                .then(() => {
                  return res.json({ message: "Request Successful" });
                })
                .catch((err) => {
                  console.error(err);
                  res.status(500).json({ error: err.code });
                });
            }
          });
      } else res.status(500).json({ error: "Money Request less than total" });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.pushMerchantDeviceToken = (req, res) => {
  const tokenDevice = {
    device: req.body.device,
  };
  db.doc(`/merchants/${req.merchant.handle}`)
    .update(tokenDevice)
    .then(() => {
      return res.json({ message: "push token successful" });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
