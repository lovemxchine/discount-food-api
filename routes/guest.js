const express = require("express");
module.exports = (db, express) => {
  const router = express.Router();

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

          if (productData.showStatus === true && productData.stock > 0) {
            productSell = true;
          }
        }
        //หลังจากทำเสร็จหมดก็ response ข้อมูลกลับไป

        if (productSell) {
          shopList.push(shopData);
        }
      }
      console.log(shopList);
      return res.status(200).send({ status: "success", data: shopList });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ status: "failed" });
    }
  });
  return router;
};
