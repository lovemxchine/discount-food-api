import multer from "multer";
import { analyzeImage } from "./gemini.mjs";

const upload = multer();

export default (express) => {
  const router = express.Router();

  router.post("/OCR", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file uploaded" });
      }

      const result = await analyzeImage(req.file.buffer);

      return res.json(result);
    } catch (error) {
      console.error("Error processing image:", error);
      res
        .status(500)
        .json({ error: "An error occurred while processing the image" });
    }
  });

  return router;
};
