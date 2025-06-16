const { uploadSingleImage } = require("../controller/image_controller");
const calculateCoordinate = require("../utils/func/calculate-coordinate");
const { Timestamp } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");
require("dotenv").config();
const { uploadMultipleImages } = require("../controller/image_controller");

module.exports = (db, express, bucket, upload) => {
  const router = express.Router();

  // Get all products
  router.get("/:uid/getAllProduct/", async (req, res) => {
    const shopUid = req.params.uid;
    const shop = await db
      .collection("shop")
      .doc(shopUid)
      .collection("products")
      .where("showStatus", "==", true)
      .where("stock", ">", 0)
      .get();
    const shopList = [];
    shop.forEach((doc) => {
      try {
        let data = doc.data();
        // data.discountAt = data.discountAt.toDate();
        data.expiredDate = data.expiredDate.toDate();
        console.log(data.expiredDate);
        shopList.push(data);
      } catch (e) {
        console.log("error");
        console.log(e);
      }
    });
    return res.status(200).send({ status: "success", data: shopList });
  });

  router.get("/:uid/getAvailableProduct/", async (req, res) => {
    const shopUid = req.params.uid;
    const shop = await db
      .collection("shop")
      .doc(shopUid)
      .collection("products")
      .where("showStatus", "==", true)
      .where("stock", ">", 0)
      .get();
    const shopList = [];
    shop.forEach((doc) => {
      console.log(shop, "shop");
      try {
        let data = doc.data();
        // data.discountAt = data.discountAt.toDate();
        data.expiredDate = data.expiredDate.toDate();
        console.log(data.expiredDate);
        shopList.push(data);
      } catch (e) {
        console.log("error");
        console.log(e);
      }
    });
    return res.status(200).send({ status: "success", data: shopList });
  });

  // Get All Order
  router.get("/:shopUid/getAllOrder/", async (req, res) => {
    const { shopUid } = req.params;
    const shop = await db
      .collection("shop")
      .doc(shopUid)
      .collection("orders")
      .get();
    const ordersList = [];
    shop.forEach((doc) => {
      try {
        let data = doc.data();
        // data.expiredDate = data.expiredDate.toDate();
        // console.log(data);

        ordersList.push(data);
      } catch (e) {
        console.log(e);

        console.log("error");
      }
    });
    // return res.status(200).send({ status: "success", data: shopList });
    return res.status(200).send({ status: "success", data: ordersList });
  });

  // Add Product
  router.post(
    "/:uid/product/addProduct",
    upload.single("image", 1),
    async (req, res) => {
      console.log("add product");
      try {
        const shopUid = req.params.uid;
        let imageUrl = null;

        // Check if file exists in request
        if (req.file) {
          imageUrl = await uploadSingleImage(req.file, bucket);
        }
        // const shopUid = req.params.uid;
        const data = req.body;
        console.log(data.expired_date);

        let [day, month, year] = data.expired_date.split("/");
        if (parseInt(year) > 2500) {
          year = parseInt(year) - 543;
          console.log("Buddhist Era");
        }
        console.log(year, month, day);
        const isoFormattedDate = `${year}-${month}-${day}T00:00:00.000Z`;
        // console.log(isoFormattedDate);

        // const formattedDate = new Date(isoFormattedDate);
        const formattedDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );
        // if (isNaN(formattedDate.getTime())) {
        //   return res
        //     .status(400)
        //     .send({ status: "failed", message: "Invalid date format" });
        // }
        console.log(formattedDate);

        console.log(data);

        const doc = await db
          .collection("shop")
          .doc(shopUid)
          .collection("products")
          .add({
            productName: data.product_name,
            salePrice: parseInt(data.sale_price),
            originalPrice: parseInt(data.original_price),
            stock: parseInt(data.stock),
            expiredDate: formattedDate || null, // isoFormattedDate ??,
            imageUrl: imageUrl,
            discountAt: Timestamp.now(),
            showStatus: true,

            // discountAt: data.discountAt,
          });
        await doc.update({ productId: doc.id });

        return res.status(200).send({ status: "success", data: data });
      } catch (err) {
        console.log("error 1");
        console.log(err.message);
        return res.status(500).send({ status: "failed" });
      }
    }
  );
  // Delete Product
  router.delete("/:uid/product/:prodId", async (req, res) => {
    try {
      const prodId = req.params.prodId;
      const shopUid = req.params.uid;
      const data = req.body;
      // const decodedPath = decodeURIComponent(
      //   data.imageUrl.split("/o/")[1].split("?")[0]
      // );
      // await bucket.file(decodedPath).delete();
      console.log(prodId);
      console.log(data);
      await db
        .collection("shop")
        .doc(shopUid)
        .collection("products")
        .doc(prodId)
        .delete();

      return res.status(200).send({ status: "delete success", data: data });
    } catch (err) {
      console.log(err.message);
    }
  });

  // Update Product
  router.patch("/:uid/product/:prodId", async (req, res) => {
    try {
      const { uid, prodId } = req.params;
      const data = req.body;
      console.log(uid, prodId);
      console.log(data);
      // Update Status and Expired Date
      if (data.allow) {
        const [day, month, year] = data.expired_date.split("/");
        const formattedDate = new Date(`${year}-${month}-${day}`);
        await db
          .collection("shop")
          .doc(uid)
          .collection("products")
          .doc(prodId)
          .update({
            expiredDate: formattedDate,
            stock: data.updateStock,
            showStatus: data.showStatus,
            discountAt: Timestamp.now(),
          });
      }
      // Update Stock
      if (data.allow === false) {
        console.log("false");
        console.log(data.updateStock);
        await db
          .collection("shop")
          .doc(uid)
          .collection("products")
          .doc(prodId)
          .update({
            stock: data.updateStock,
          });
      }
      return res.status(200).send({ status: "success", data: req.body });
    } catch (err) {
      console.log(err.message);
      return res.status(400).send({ status: "error" });
    }
  });

  router.get("/profileDetail/:uid", async (req, res) => {
    try {
      const { uid } = req.params;
      console.log(uid);
      const userData = await db.collection("users").doc(uid).get();
      const shopData = await db.collection("shop").doc(uid).get();
      const data = userData.data();
      data.shopData = shopData.data();
      return res.status(200).send({ status: "success", data });
    } catch (err) {
      console.log(err.message);
      return res.status(400).send({ status: "error" });
    }
  });

  router.post("/uploadImage", async (req, res) => {
    if (req.file) {
      imageUrl = await uploadSingleImage(req.file, bucket);
    }
    return res.status(200).send({ status: "success", imageUrl });
  });

  router.get("/nearbyShop", async (req, res) => {
    const { lng, lat, distance } = req.query;

    if (!lng || !lat) {
      return res
        .status(400)
        .json({ status: "error", message: "Missing coordinates" });
    }

    // const coordinate = calculateCoordinate(parseFloat(lat), parseFloat(lng), 5);
    const coordinate = calculateCoordinate(
      parseFloat(lat),
      parseFloat(lng),
      distance ? parseInt(distance) : 5
    );
    console.log(coordinate);
    const snapshot = await db
      .collection("shop")
      .where("googleLocation.lat", ">=", coordinate.minLat)
      .where("googleLocation.lat", "<=", coordinate.maxLat)
      .where("googleLocation.lng", ">=", coordinate.minLon)
      .where("googleLocation.lng", "<=", coordinate.maxLon)
      .where("status", "==", "active")
      .get();

    // Filter shops that have at least one available product (showStatus == true)
    const filteredDocs = [];
    for (const doc of snapshot.docs) {
      const productsSnapshot = await db
        .collection("shop")
        .doc(doc.id)
        .collection("products")
        .where("showStatus", "==", true)
        .get();
      if (!productsSnapshot.empty) {
        filteredDocs.push(doc);
      }
    }
    console.log("ssadasdasd z", filteredDocs);
    // Use filteredDocs directly instead of snapshot.docs
    if (filteredDocs.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No shops found",
        data: [],
      });
    }

    const shopList = filteredDocs.map((doc) => {
      const data = doc.data();
      return data;
    });
    return res.status(200).json({
      status: "success",
      message: "shop founded",
      data: shopList || [],
    });
  });
  router.get("/:uid/fetchOrder", async (req, res) => {
    const { uid } = req.params;
    try {
      const ordersList = await db
        .collection("shop")
        .doc(uid)
        .collection("orders")
        .get();

      const ordersListData = [];
      ordersList.forEach((doc) => {
        try {
          let data = doc.data();
          ordersListData.push({
            orderId: doc.id,
            customerUid: data.customerUid,
            orderAt: data.orderAt,
            totalPrice: data.totalPrice,
            status: data.status,
          });
        } catch (e) {
          console.log("error", e);
        }
      });
      return res.status(200).send({ status: "success", data: ordersListData });
    } catch (err) {
      console.log(err.message);
      return res.status(400).send({ status: "error" });
    }
  });

  router.get("/:uid/fetchOrderDetail", async (req, res) => {
    const { uid } = req.params;
    const { orderId } = req.query;
    try {
      const ordersList = await db
        .collection("shop")
        .doc(uid)
        .collection("orders")
        .doc(orderId)
        .get();

      return res
        .status(200)
        .send({ status: "success", data: ordersList.data() });
    } catch (err) {
      console.log(err.message);
      return res.status(400).send({ status: "error" });
    }
  });

  router.post("/updateOrderStatus", async (req, res) => {
    const { customerUid, shopUid, orderId, status } = req.body;
    console.log("status.log", req.body);
    if (!["Pending Order", "Success", "Rejected"].includes(status)) {
      return res.status(400).send({
        status: "error",
        message: "Invalid status value",
      });
    }

    try {
      const orderSnapshot = await db
        .collection("shop")
        .doc(shopUid)
        .collection("orders")
        .doc(orderId)
        .get();
      if (!orderSnapshot.exists) {
        return res.status(404).send({
          status: "error",
          message: "Order not found",
        });
      }
      if (["Success", "Rejected"].includes(orderSnapshot.data())) {
        return res.status(400).send({
          status: "failed",
          message: "this order cant be updated",
        });
      }
      const orderShopStatus = await db
        .collection("shop")
        .doc(shopUid)
        .collection("orders")
        .doc(orderId)
        .update({
          status: status,
        });
      const orderCustomerStatus = await db
        .collection("users")
        .doc(customerUid)
        .collection("orders")
        .doc(orderId)
        .update({
          status: status,
        });
      const orderData = orderSnapshot.data();
      if (
        status === "Success" &&
        orderData &&
        Array.isArray(orderData.products)
      ) {
        const batch = db.batch();
        for (const product of orderData.products) {
          const productRef = db
            .collection("shop")
            .doc(shopUid)
            .collection("products")
            .doc(product.productId);
          // Delete product if order is confirmed as success
          batch.delete(productRef);
        }
        await batch.commit();
      }

      return res.status(200).send({ status: "success" });
    } catch (err) {
      console.log(err.message);
      return res.status(400).send({ status: "error" });
    }
  });

  router.post("/testAddedProduct", async (req, res) => {
    const data = req.body;
    try {
      await db
        .collection("shop")
        .doc(data.uid)
        .collection("products")
        .add({
          productName: data.productName,
          salePrice: data.salePrice,
          originalPrice: data.originalPrice,
          stock: parseInt(data.stock),
          expiredDate: data.expiredDate, // isoFormattedDate ??,
          imageUrl: data.imageUrl,
          discountAt: Timestamp.now(),
          showStatus: true,
        });
      return res.status(200).send({ status: "success" });
    } catch (err) {
      console.log(err.message);
      return res.status(400).send({ status: "error" });
    }
  });

  router.post("/updatePayment", upload.single("image", 1), async (req, res) => {
    console.log("updatePayment");
    const { shopId, accName, bankName, bankNumber } = req.body;
    let qrImg = null;
    if (!shopId) {
      return res
        .status(400)
        .send({ status: "error", message: "shopId is required" });
    }
    try {
      if (req.file) {
        qrImg = await uploadSingleImage(req.file, bucket);
        if (!qrImg) {
          return res
            .status(400)
            .send({ status: "error", message: "Image upload failed" });
        }
      }

      const updateField = {
        ...(qrImg || qrImg == "" ? { qrImg } : {}),
        ...(accName || accName == "" ? { accName } : {}),
        ...(bankName || bankName == "" ? { bankName } : {}),
        ...(bankNumber || bankNumber == "" ? { bankNumber } : {}),
      };
      console.log("updateField", updateField);
      if (Object.keys(updateField).length === 0) {
        return res
          .status(400)
          .send({ status: "error", message: "No fields to update" });
      }
      // Only update the specified fields inside the "payment" object, without overwriting other fields
      await db.collection("shop").doc(shopId).set(
        {
          payment: updateField,
        },
        { merge: true }
      );
      return res.status(200).send({ status: "success" });
    } catch (err) {
      console.log(err.message);
      return res.status(400).send({ status: "error" });
    }
  });

  router.get("/getPayment", async (req, res) => {
    const { shopId } = req.query;
    if (!shopId) {
      return res
        .status(400)
        .send({ status: "error", message: "shopId is required" });
    }
    try {
      const shopDoc = await db.collection("shop").doc(shopId).get();
      if (!shopDoc.exists) {
        return res.status(404).send({
          status: "error",
          message: "Shop not found",
        });
      }
      const paymentData = shopDoc.data().payment || {};
      return res.status(200).send({ status: "success", data: paymentData });
    } catch (err) {
      console.log(err.message);
      return res.status(400).send({ status: "error" });
    }
  });

  router.post("/updateShop", async (req, res) => {
    try {
      console.log(req.body);
      const { uid } = req.query;

      if (!uid) {
        return res
          .status(400)
          .send({ status: "failed", message: "Missing uid in query" });
      }

      await db.collection("shop").doc(uid).update({
        name: req.body.name,
        tel: req.body.tel,
        openAt: req.body.openAt,
        closeAt: req.body.closeAt,
      });

      return res
        .status(200)
        .send({ status: "success", message: "data updated" });
    } catch (error) {
      console.error(error.message);
      return res.status(500).send({ status: "failed", message: error.message });
    }
  });

  router.post(
    "/updateShopImages",
    upload.array("images", 2),
    async (req, res) => {
      const { uid } = req.query;

      console.log("req.query:", req.query);
      console.log("req.files:", req.files);

      if (!uid) {
        return res
          .status(400)
          .send({ status: "failed", message: "Missing uid in query" });
      }

      try {
        const imageUrls = await uploadMultipleImages(req, bucket);

        const updateData = {};

        if (imageUrls[0]) updateData["imgUrl.shopUrl"] = imageUrls[0];
        if (imageUrls[1]) updateData["imgUrl.shopCoverUrl"] = imageUrls[1];

        await db.collection("shop").doc(uid).update(updateData);

        return res
          .status(200)
          .send({ status: "success", message: "Images updated" });
      } catch (error) {
        console.error(error.message);
        return res
          .status(500)
          .send({ status: "failed", message: error.message });
      }
    }
  );

  router.post("/updateQrImage", upload.single("image"), async (req, res) => {
    const { uid } = req.query;

    console.log("req.query:", req.query);
    console.log("req.file:", req.file);

    if (!uid) {
      return res
        .status(400)
        .send({ status: "failed", message: "Missing uid in query" });
    }

    try {
      const imageUrl = await uploadSingleImage(req.file, bucket);

      await db.collection("shop").doc(uid).update({
        "payment.qrImg": imageUrl,
      });

      return res
        .status(200)
        .send({ status: "success", message: "QR image updated" });
    } catch (error) {
      console.error(error.message);
      return res.status(500).send({ status: "failed", message: error.message });
    }
  });

  router.post("/test-mailer", async (req, res) => {
    const { to, subject, text } = req.body;

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: `"My App" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
      };

      const info = await transporter.sendMail(mailOptions);
      res.status(200).json({ message: "Email sent!", info });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ message: "Failed to send email", error });
    }
  });
  return router;
};
