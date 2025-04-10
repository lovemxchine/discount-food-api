import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

const result = dotenv.config();
if (result.error) {
  console.error("Error loading .env file:", result.error);
} else {
  console.log(".env file loaded successfully");
}

const API_KEY = process.env.GEMINI_API_KEY;
// console.log("API_KEY" + API_KEY);

// โมเดล
const MODEL_NAME = "gemini-2.0-flash-001";

const genAI = new GoogleGenerativeAI(API_KEY);

// const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function analyzeImage(imageBuffer) {
  // await delay(1000);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const imageParts = [
    {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType: "image/jpeg",
      },
    },
  ];

  const prompt = `สกัดคำรูปภาพนี้และระบุข้อมูลต่อไปนี้:
**The 26th Buddhist Century if in image expired year is between 2500-2600 **
**The 21st Century (AD) if in image expired year is between 2000-2100 **
**Important ! Buddhist Era change to BC DD/MM/YYYY **
กรุณาตอบในรูปแบบ JSON ดังนี้:
{
  "product_name": "ชื่อสินค้า",
  "old_price": "ราคาเดิม (หรือ null ถ้าไม่มี)",
  "new_price": "ราคาใหม่",
  "expiry_date": "วันที่หมดอายุ(หรือ null ถ้าไม่มี)"
}
หมายเหตุ:
- ลองวิเคราะห์ว่าคำไหนเป็นชื่ออาหาร
- ชื่อสินค้าในป้ายบางอันอาจจะมีผสมชื่อแบรนด์
- ใช้ภาษาไทยสำหรับชื่อสินค้า
- ใช้ตัวเลขสำหรับราคา (ไม่ต้องมีสัญลักษณ์สกุลเงิน)
- ตอบเฉพาะ JSON เท่านั้น ไม่ต้องมีข้อความอื่นๆ
`;

  let retries = 0;
  const maxRetries = 3; // จำนวนครั้งที่ลองใหม่สูงสุด
  let waitTime = 1000; // เวลารอเริ่มต้น (มิลลิวินาที)

  // while (retries < maxRetries) {
  try {
    // await delay(1000); // หน่วงเวลาก่อนเรียก API (สามารถปรับได้)
    console.log("TESTNIDNOI");
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    let text = response.text();

    text = text.trim().replace(/^```json|```$/g, "");
    text = text.trim();

    // ตรวจสอบว่า JSON อยู่ในรูปแบบที่ถูกต้อง
    if (text.startsWith("{") && text.endsWith("}")) {
      return JSON.parse(text);
    } else {
      throw new Error("Invalid JSON format: " + text);
    }
  } catch (error) {
    console.error(`Error in analyzeImage (attempt ${retries + 1}):`, error);
    if (error.status === 429) {
      // ตรวจสอบว่าเป็นข้อผิดพลาด 429 หรือไม่
      // retries++;
      console.log(`Rate limit hit, retrying in ${waitTime / 1000} seconds...`);
      // await delay(waitTime); // รอตามเวลาที่กำหนด
      // waitTime *= 2; // เพิ่มเวลาคูณสอง (exponential backoff)
    } else {
      throw error; // ถ้าไม่ใช่ข้อผิดพลาด 429 ให้ส่งต่อข้อผิดพลาดไปเลย
    }
  }
  // }

  throw new Error("Max retries exceeded for Gemini API."); // ถ้าลองใหม่ครบทุกครั้งแล้วยังไม่สำเร็จ ให้โยนข้อผิดพลาด
}
