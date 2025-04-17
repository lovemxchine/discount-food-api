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
      const { uid } = req.body;
      console.log(uid);
      const userData = await db.collection("users").doc(uid).get();
      return res.status(200).send({ status: "success", data: userData.data() });
    } catch (err) {
      console.log(err.message);
      return res.status(400).send({ status: "error" });
    }
  });

  return router;
};
