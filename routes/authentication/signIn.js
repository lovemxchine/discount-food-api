// const express = require("express");
module.exports = (db, express) => {
  const router = express.Router();

  router.post("/signIn", async (req, res, bucket) => {
    const registerShop = await db
      .collection("in_register_shop")
      .doc(req.body.checkUID)
      .get();
    if (registerShop.exists) {
      // ถ้าร้านค้าสมัครแล้ว (ยังไม่ได้ยืนยันข้อมูล) ส่งข้อมูลกลับไปให้หน้าบ้านแสดงว่ายังเข้าไม่ได้
      return res
        .status(200)
        .send({ userStatus: "registerShop", data: registerShop.data() });
    }
    const user = await db.collection("users").doc(req.body.checkUID).get();
    if (user.exists) {
      const data = user.data();
      if (data.role === "shopkeeper") {
        // ถ้าเป็นร้านค้าให้ไปที่หน้า shop
        const user = await db
          .collection("shop")
          .where("uid", "==", req.body.checkUID)
          .get();
        if (user.empty) {
          // ถ้าไม่มีร้านค้าให้ส่งกลับไปที่หน้า register shop
          return res.status(200).send({
            userStatus: "registerShop",
            role: data.role,
            data: [user.data(), req.body.checkUID],
          });
        }
        // ถ้าร้านค้ามีแต่สถานะเป็น disable
        const shopDoc = user.docs[0];
        if (shopDoc && shopDoc.data().status === "disable") {
          return res.status(200).send({
            userStatus: "shopDisabled",
            role: data.role,
            data: [user.data(), req.body.checkUID],
          });
        }
      }
      // console.log(role === "customer");
      return res.status(200).send({
        userStatus: "success",
        role: data.role,
        data: [user.data(), req.body.checkUID],
      });
    }

    return res.status(404).send({ status: "not_found", data: null });
  });

  return router;
};
