const express = require("express");
module.exports = (db, express) => {
  const router = express.Router();
  router.get("/getShop/", async (req, res) => {});
  // ไว้สำหรับร้านค้าที่กำลังขายสินค้าอยู่
  router.get("/availableShop", async (req, res) => {
    try {
      const result = [];

      const shopSnapshot = await db
        .collection("shop")
        .where("status", "==", "active")
        .get();

      if (shopSnapshot.empty) {
        return res.status(200).send({ status: "success", data: [] });
      }

      for (const shopDoc of shopSnapshot.docs) {
        const shopData = shopDoc.data();
        const shopId = shopDoc.id;

        const productsSnapshot = await db
          .collection("shop")
          .doc(shopId)
          .collection("products")
          .where("showStatus", "==", true)
          .get();

        const products = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // เพิ่มเฉพาะร้านที่มีสินค้าที่แสดง
        if (products.length > 0) {
          result.push({
            shopId,
            ...shopData,
            products,
          });
        }
      }

      return res.status(200).send({ status: "success", data: result });
    } catch (error) {
      console.error("Error fetching available shops:", error);
      return res.status(500).send({ status: "failed", error: error.message });
    }
  });

  router.get("/profileDetail", async (req, res) => {
    try {
      const { uid } = req.query;

      console.log(uid);
      const userData = await db.collection("users").doc(uid).get();
      return res.status(200).send({ status: "success", data: userData.data() });
    } catch (err) {
      console.log(err.message);
      return res.status(400).send({ status: "error" });
    }
  });

  router.post("/favoriteShop", async (req, res) => {
    try {
      const { uid, shopUid } = req.body;

      console.log(uid);
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();
      console.log(userDoc);

      if (!userDoc.exists) {
        return res
          .status(404)
          .send({ status: "error", message: "User not found" });
      }

      const userData = userDoc.data();
      const favShop = userData.favShop || [];
      if (favShop.includes(shopUid)) {
        const index = favShop.indexOf(shopUid);
        favShop.splice(index, 1);
        await userRef.update({ favShop });
        return res.status(200).send({ status: "success", data: userData });
      }
      if (!favShop.includes(shopUid)) {
        favShop.push(shopUid);
        await userRef.update({ favShop });
      }
      return res.status(200).send({ status: "success", data: userData });
    } catch (err) {
      console.log(err.message);
      return res.status(400).send({ status: "error" });
    }
  });

  router.post("/reportShop", async (req, res) => {
    try {
      const { description, shopUid, title, shopName, userUid } = req.body;

      const userRef = await db.collection("users").doc(userUid).get();

      if (!userRef.exists) {
        return res
          .status(404)
          .send({ status: "error", message: "User not found" });
      }

      const reportData = {
        createdAt: new Date().toISOString(),
        sender: userRef.data().fname + " " + userRef.data().lname,
        title,
        description,
        shopUid,
        shopName,
      };

      await db.collection("reports").add(reportData);

      return res.status(200).send({ status: "success", data: reportData });
    } catch (err) {
      console.log(err.message);
      return res.status(400).send({ status: "error" });
    }
  });

  router.get("/fetchFavoriteShop", async (req, res) => {
    try {
      const { uid } = req.query;
      console.log(uid);
      const userData = await db.collection("users").doc(uid).get();
      const favShop = userData.data().favShop || [];

      const result = [];

      for (const shopUid of favShop) {
        const shopDoc = await db.collection("shop").doc(shopUid).get();
        if (shopDoc.exists) {
          result.push({ id: shopUid, ...shopDoc.data() });
        }
      }

      return res.status(200).send({ status: "success", data: result });
    } catch (err) {
      console.log(err.message);
      return res.status(400).send({ status: "error" });
    }
  });

  router.get("/getShopDetails", async (req, res) => {
    const { uid } = req.query;
    try {
      const shopData = await db.collection("shop").doc(uid).get();
      if (!shopData.exists) {
        return res
          .status(404)
          .send({ status: "error", message: "Shop not found" });
      }
      return res.status(200).send({ status: "success", data: shopData.data() });
    } catch (err) {
      console.log(err.message);
      return res.status(400).send({ status: "error" });
    }
  });

  return router;
};
