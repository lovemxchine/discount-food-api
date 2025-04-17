module.exports = (db, express) => {
  const router = express.Router();

  router.post("/confirmationShop", async (req, res) => {
    try {
      const { uid, status } = req.body;
      if (status !== "APPROVE") {
        await db.collection("in_register_shop").doc(uid).delete();
        return res.status(400).send({ status: "failed" });
      }
      const shop = await db.collection("in_register_shop").doc(uid).get();
      const shopData = shop.data();
      // เช็คทุกร้านค้า
      await db
        .collection("shop")
        .doc(uid)
        .set({ ...shopData, status: "active" });

      await db.collection("users").doc(uid).set({
        uid: uid,
        role: "shopkeeper",
        fname: shopData.shopkeeperData.name,
        lname: shopData.shopkeeperData.surname,
        email: shopData.email,
        tel: shopData.tel,
      });
      //   console.log(shopList);
      return res.status(200).send({ status: "success" });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ status: "failed" });
    }
  });

  router.post("/updateStatus", async (req, res) => {
    try {
      const { uid, status } = req.body;

      const shop = await db.collection("shop").doc(uid).get();

      if (!shop.exists) {
        return res.status(400).send({ status: "not found shop" });
      }

      if (shop.data().status === "disable") {
        return res.status(400).send({ status: "shop is permanently disable" });
      }

      if (!uid || !status) {
        return res
          .status(400)
          .send({ status: "not found request body or some field lost" });
      }
      if (!["active", "inactive", "disable"].includes(status.toLowerCase())) {
        return res.status(400).send({ status: "not found status" });
      }

      await db.collection("shop").doc(uid).update({
        status: status,
      });

      return res.status(200).send({
        status: "success",
        message: "Status updated",
        payload: { status: status },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ status: "failed" });
    }
  });

  router.get("/fetchShop/", async (req, res) => {
    const { status } = req.query;
    try {
      const shopList = [];
      let query = db.collection("shop");

      if (status) {
        query = query.where("status", "==", status);
      }

      const shopsSnapshot = await query.get();

      if (shopsSnapshot.empty) {
        return res.status(200).send({ status: "success", data: [] });
      }

      for (const shopDoc of shopsSnapshot.docs) {
        const shopData = shopDoc.data();
        const shopId = shopDoc.id;
        shopList.push({ id: shopId, ...shopData });
      }

      return res
        .status(200)
        .send({ status: "success", count: shopList.length, data: shopList });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ status: "failed" });
    }
  });

  router.get("/fetchRegisterShops", async (req, res) => {
    try {
      const shopList = [];
      const shopsSnapshot = await db.collection("in_register_shop").get();

      if (shopsSnapshot.empty) {
        return res.status(200).send({ status: "success", data: [] });
      }

      for (const shopDoc of shopsSnapshot.docs) {
        const shopData = shopDoc.data();
        const shopId = shopDoc.id;
        shopList.push({ id: shopId, ...shopData });
      }

      return res
        .status(200)
        .send({ status: "success", count: shopList.length, data: shopList });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ status: "failed" });
    }
  });
  return router;
};
