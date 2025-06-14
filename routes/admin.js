const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/func/sending-mail.js");

module.exports = (db, express) => {
  const router = express.Router();

  router.post("/confirmationShop", async (req, res) => {
    try {
      const { uid, status } = req.body;

      const shop = await db.collection("in_register_shop").doc(uid).get();
      const shopData = shop.data();
      if (!shop.exists) {
        return res.status(404).send({ status: "not found shop" });
      }

      if (status === "REJECT") {
        await sendMail(
          shopData.email,
          "การยืนยันการลงทะเบียนร้านค้า",
          "ร้านค้าของคุณถูกปฏิเสธการลงทะเบียน กรุณาติดต่อผู้ดูแลระบบเพื่อขอข้อมูลเพิ่มเติม"
        );
        await db.collection("in_register_shop").doc(uid).delete();
        return res.status(200).send({ status: "rejected" });
      }
      if (status !== "APPROVE") {
        return res.status(400).send({ status: "failed" });
      }

      // เช็คทุกร้านค้า
      await db
        .collection("shop")
        .doc(uid)
        .set({ ...shopData, status: "active" });
      sendMail(
        shopData.email,
        "การยืนยันการลงทะเบียนร้านค้า",
        "ร้านค้าของคุณได้รับการอนุมัติแล้ว คุณสามารถเริ่มขายสินค้าได้ทันที"
      );
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

  router.post("/register", async (req, res) => {
    const data = req.body;

    try {
      // Create a new admin document
      // Hash the password before storing
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Store admin in DB
      await db.collection("admin").add({
        email: data.email,
        password: hashedPassword,
      });

      // Generate JWT token
      const token = jwt.sign(
        { email: data.email, role: "admin" },
        process.env.JWT_SECRET || "your_jwt_secret",
        { expiresIn: "1d" }
      );

      // Return token in response
      return res
        .status(201)
        .send({ status: "success", message: "Admin registered", token });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ status: "failed", message: error.message });
    }
  });

  // Admin login
  router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
      // Find admin by email
      const snapshot = await db
        .collection("admin")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return res
          .status(401)
          .send({ status: "failed", message: "Invalid credentials" });
      }

      const adminDoc = snapshot.docs[0];
      const adminData = adminDoc.data();

      // Compare password
      const isMatch = await bcrypt.compare(password, adminData.password);
      if (!isMatch) {
        return res
          .status(401)
          .send({ status: "failed", message: "Invalid credentials" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { email: adminData.email, role: "admin" },
        process.env.JWT_SECRET || "your_jwt_secret",
        { expiresIn: "1d" }
      );

      return res
        .status(200)
        .send({ status: "success", message: "Login successful", token });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ status: "failed", message: error.message });
    }
  });
  return router;
};
