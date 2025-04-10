const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const multer = require("multer");
require("dotenv").config();
const { getStorage } = require("firebase/storage");
const cron = require("node-cron");
const guest = require("./routes/guest");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://discount-project-6dfc5.appspot.com",
});

const port = 3000;
const app = express();
const db = admin.firestore();
const bucket = admin.storage().bucket(); // Using bucket from Firebase Admin SDK
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}); // Allow up to 3 images

// Routes
const registerRoute = require("./routes/authentication/register")(
  db,
  express,
  bucket,
  upload
);
const signInRoute = require("./routes/authentication/signIn")(db, express);
const shopRoute = require("./routes/shop")(db, express, bucket, upload);
const customerRoute = require("./routes/customer")(db, express);
const guestRoute = require("./routes/guest")(db, express);

app.use(express.json());
app.use(cors({ origin: true }));

// TODO : add middleware to each endpoint/route for authentication (role)

app.use("/authentication", signInRoute);
app.use("/authentication", registerRoute);
app.use("/customer", customerRoute);
app.use("/shop", shopRoute);
app.use("/guest", guestRoute);

(async () => {
  const { default: geminiRoute } = await import(
    "./routes/gemini/geminiEndpoint.mjs"
  );
  app.use("/gemini", geminiRoute(express));
})();

// Check products that expired
cron.schedule(
  "00 00 * * *",
  async () => {
    const now = new Date();
    console.log(
      `เช็คสินค้าที่มีส่วนลดเกิน 2 วันแล้ว - เริ่มทำงาน: ${now.toLocaleString(
        "th-TH"
      )}`
    );

    try {
      // Get all shops first
      const shopsSnapshot = await db.collection("shop").get();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
      const twoDaysAgoTimestamp =
        admin.firestore.Timestamp.fromDate(twoDaysAgo);

      let totalUpdated = 0;
      const batchSize = 500;
      let currentBatch = db.batch();
      let batchCount = 0;

      // Process each shop
      for (const shopDoc of shopsSnapshot.docs) {
        const shopId = shopDoc.id;

        // Query products for this shop
        const productsSnapshot = await db
          .collection("shop")
          .doc(shopId)
          .collection("products")
          .where("showStatus", "==", true)
          .where("discountAt", "<", twoDaysAgoTimestamp)
          .get();

        // Update products for this shop
        for (const productDoc of productsSnapshot.docs) {
          currentBatch.update(productDoc.ref, {
            showStatus: false,
            updatedAt: admin.firestore.Timestamp.now(),
          });

          batchCount++;
          totalUpdated++;

          console.log(
            `อัพเดต showStatus เป็น false รหัสสินค้า (productID): ${productDoc.id} รหัสร้านค้า (${shopId})`
          );

          // Commit batch if it reaches the limit
          if (batchCount >= batchSize) {
            await currentBatch.commit();
            console.log(
              `Committed batch of ${batchCount} updates at ${new Date().toLocaleString(
                "th-TH"
              )}`
            );
            currentBatch = db.batch();
            batchCount = 0;
          }
        }
      }

      // Commit any remaining updates
      if (batchCount > 0) {
        await currentBatch.commit();
        console.log(
          `Committed final batch of ${batchCount} updates at ${new Date().toLocaleString(
            "th-TH"
          )}`
        );
      }

      console.log(
        `Total products updated: ${totalUpdated} at ${new Date().toLocaleString(
          "th-TH"
        )}`
      );

      if (totalUpdated === 0) {
        console.log("No products needed updating");
      }
    } catch (error) {
      console.error("Error updating showStatus: ", error);

      // More detailed error logging
      if (error.code === 9) {
        console.error(
          "Index error - Please create the required index in Firebase Console"
        );
      }
    }
  },
  {
    scheduled: true,
    timezone: "Asia/Bangkok",
  }
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
