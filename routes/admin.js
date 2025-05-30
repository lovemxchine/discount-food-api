module.exports = (db, express) => {
  const router = express.Router();

  router.post("/confirmationShop", async (req, res) => {
    try {
      const { uid, status } = req.body;
      if (status === "REJECT") {
        await db.collection("in_register_shop").doc(uid).delete();
        return res.status(400).send({ status: "failed" });
      }
      if (status !== "APPROVE") {
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
      await db.collection("in_register_shop").doc(uid).delete();

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

  router.get("/customer", async (req, res) => {
    try {
      const snapshot = await db
        .collection("users")
        .where("role", "==", "customer")
        .get();

      if (snapshot.empty) {
        return res.status(200).send({ status: "success", data: [] });
      }

      const customers = [];
      snapshot.forEach((doc) => {
        customers.push({ id: doc.id, ...doc.data() });
      });

      return res.status(200).send({ status: "success", data: customers });
    } catch (error) {
      console.error("Error fetching customers:", error.message);
      return res
        .status(500)
        .send({ status: "failed", message: "Internal Server Error" });
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

  router.get("/reportShop", async (req, res) => {
    await db
      .collection("reports")
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          return res.status(200).send({ status: "success", data: [] });
        }

        const reports = [];
        snapshot.forEach((doc) => {
          reports.push(doc.data());
        });

        return res.status(200).send({ status: "success", data: reports });
      })
      .catch((error) => {
        console.error("Error fetching reports:", error.message);
        return res
          .status(500)
          .send({ status: "failed", message: "Internal Server Error" });
      });
  });

  router.get("/testFetch", async (req, res) => {
    const { uid, docId } = req.query;
    try {
      const snapshot = await db
        .collection("shop")
        .doc(uid)
        .collection("orders")
        .doc(docId)
        .get();
      console.log(snapshot.data());
      return res.status(200).send({ status: "success", data: snapshot.data() });
    } catch (error) {
      console.error("Error fetching test data:", error.message);
      return res
        .status(500)
        .send({ status: "failed", message: "Internal Server Error" });
    }
  });

  router.post("/testUpdate", async (req, res) => {
    const { uid } = req.body;

    const snapshot = await db.collection("shop").doc(uid).set(req.body);
    return res.status(200).send({ status: "success" });
  });
  return router;
};
