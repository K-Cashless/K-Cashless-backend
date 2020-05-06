const functions = require("firebase-functions");

const express = require("express");
const app = express();
//const app = require('express')();

const FBAuth = require("./utility/fbAuth");
const FBAuthUser = require("./utility/fbAuthUser");
const FBAuthMerchant = require("./utility/fbAuthMerchant");
const FBAuthAdmin = require("./utility/fbAuthAdmin");

const cors = require("cors");
app.use(cors());

const { db } = require("./utility/admin");

const {
  adminSignup,
  adminLogin,
  getAdminData,
  getRequest,
  acceptRequest,
  createPromotion,
  getAllPromotions,
  generatePrepaidCard,
  getAllPrepaidCard,
  deleteOnePrepaidCards,
} = require("./handlers/admins");
const {
  signup,
  login,
  logout,
  getUserData,
  resetPass,
  uploadUserImage,
  addUserDetails,
  getAuthenticatedUser,
  topup,
  transfer,
  getAllUserData,
  updateUserDetails,
  redeemPoint,
  userGetMerchant,
  pushUserDeviceToken,
} = require("./handlers/users");
const {
  merchantSignup,
  merchantLogin,
  getMerchantData,
  getAllMerchantData,
  moneyRequest,
  updateMerchantDetails,
  uploadMerchantImage,
  pushMerchantDeviceToken,
} = require("./handlers/merchants");

const {
  getAllTransactions,
  getOneUserTransaction,
  getOneMerchantTransaction,
} = require("./handlers/transaction");

//Transaction route
app.get("/getAllTransactions", FBAuthAdmin, getAllTransactions);
app.get("/getOneUserTransaction", FBAuthUser, getOneUserTransaction);
app.get(
  "/merchant/getOneMerchantTransaction",
  FBAuthMerchant,
  getOneMerchantTransaction
);
//All user
app.get("/getAllPromotions", getAllPromotions);
//Admin route
app.post("/adminSignup", adminSignup);
app.post("/adminLogin", adminLogin);
app.get("/getAdminData", FBAuthAdmin, getAdminData);
app.get("/getAllMerchantData", FBAuthAdmin, getAllMerchantData);
app.get("/getAllUserData", FBAuthAdmin, getAllUserData);
app.get("/merchant/getRequest", FBAuthAdmin, getRequest);
app.post("/merchant/acceptRequest", FBAuthAdmin, acceptRequest);
app.post("/admin/createPromotion", FBAuthAdmin, createPromotion);
app.post("/admin/generatePrepaidCard", FBAuthAdmin, generatePrepaidCard);
app.get("/admin/getAllPrepaidCard", FBAuthAdmin, getAllPrepaidCard);
app.post(
  "/admin/deleteOnePrepaidCards/:cardID",
  FBAuthAdmin,
  deleteOnePrepaidCards
);
//Merchants route
app.post("/merchantSignup", merchantSignup);
app.post("/merchantLogin", merchantLogin);
app.get("/getMerchantData", FBAuthMerchant, getMerchantData);
app.post("/merchant/moneyRequest", FBAuthMerchant, moneyRequest);
app.post("/merchant/updateMerchantData", FBAuthMerchant, updateMerchantDetails);
app.post(
  "/merchant/pushMerchantDeviceToken",
  FBAuthMerchant,
  pushMerchantDeviceToken
);
app.post("/merchant/image", FBAuthMerchant, uploadMerchantImage);
//Users route
app.post("/signup", signup);
app.post("/login", login);
app.post("/logout", FBAuth, logout);
app.get("/getUserData", FBAuthUser, getUserData);
app.post("/resetPass", resetPass);
app.post("/user/image", FBAuthUser, uploadUserImage);
app.post("/user", FBAuthUser, addUserDetails);
app.get("/user", FBAuthUser, getAuthenticatedUser);
app.post("/prepaidCard/:cardID", FBAuthUser, topup);
app.post("/paid/:merchantID", FBAuthUser, transfer);
app.post("/user/updateData", FBAuthUser, updateUserDetails);
app.post("/user/redeemPoint", FBAuthUser, redeemPoint);
app.get("/user/getMerchant/:merchantID", FBAuthUser, userGetMerchant);
app.post("/user/pushUserDeviceToken", FBAuthUser, pushUserDeviceToken);

exports.api = functions.region("asia-east2").https.onRequest(app);

exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello world");
});
