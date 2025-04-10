const express = require("express");
module.exports = (db, express) => {
  const router = express.Router();
  router.get("/getShop/", async (req, res) => {});
  // ไว้สำหรับร้านค้าที่กำลังขายสินค้าอยู่
  router.get("/availableShop/", async (req, res) => {
    try {
      const shopList = [];
      const shopsSnapshot = await db.collection("shop").get();
      // เช็คทุกร้านค้า
      for (const shopDoc of shopsSnapshot.docs) {
        const shopData = shopDoc.data();
        const shopId = shopDoc.id;
        let productSell = false;
        const productsSnapshot = await db
          .collection("shop")
          .doc(shopId)
          .collection("products")
          .get();
        for (const productDoc of productsSnapshot.docs) {
          const productData = productDoc.data();
          // ไปเช็คทุกรสินค้าว่ามีขายไหม

          if (productData.showStatus === true) {
            productSell = true;
          }
        }
        //หลังจากทำเสร็จหมดก็ response ข้อมูลกลับไป

        if (productSell) {
          shopList.push(shopData);
        }
      }

      return res.status(200).send({ status: "success", data: shopList });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ status: "failed" });
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
