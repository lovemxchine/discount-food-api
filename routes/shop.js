const { uploadSingleImage } = require("../controller/image_controller");
const calculateCoordinate = require("../utils/func/calculate-coordinate");
const { Timestamp } = require("firebase-admin/firestore");

module.exports = (db, express, bucket, upload) => {
  const router = express.Router();

  // Get all products
  router.get("/:uid/getAllProduct/", async (req, res) => {
    const shopUid = req.params.uid;
    const shop = await db
      .collection("shop")
      .doc(shopUid)
      .collection("products")
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

        const formattedDate = new Date(isoFormattedDate);
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
    const { lng, lat } = req.query;

    if (!lng || !lat) {
      return res
        .status(400)
        .json({ status: "error", message: "Missing coordinates" });
    }

    const coordinate = calculateCoordinate(parseFloat(lat), parseFloat(lng), 5);
    console.log(coordinate);
    const snapshot = await db
      // .collection("shop")
      // .where("lat", ">=", coordinate.minLat.toString())
      // .where("lat", "<=", coordinate.maxLat.toString())
      // .where("lng", ">=", coordinate.minLon.toString())
      // .where("lng", "<=", coordinate.maxLon.toString())
      // .get();
      .collection("shop")
      .where("googleLocation.lat", ">=", coordinate.minLat)
      .where("googleLocation.lat", "<=", coordinate.maxLat)
      .where("googleLocation.lng", ">=", coordinate.minLon)
      .where("googleLocation.lng", "<=", coordinate.maxLon)
      .get();
    console.log(snapshot);
    console.log(snapshot.docs);
    console.log(snapshot.docs.length);
    if (snapshot.empty) {
      return res.status(404).json({
        status: "error",
        message: "No shops found",
        data: [],
      });
    }

    const shopList = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        shopId: doc.id,
        shopName: data.shopName,
        lat: data.lat,
        lng: data.lng,
        googleLocation: data.googleLocation,
      };
    });
    return res.status(200).json({
      status: "success",
      message: "shop founded",
      data: shopList || [],
    });
  });

  return router;
};
