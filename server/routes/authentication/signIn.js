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
