const nodemailer = require("nodemailer");

const sendMail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"ข้อความจากระบบขายสินค้าลดราคา" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    // res.status(200).json({ message: "Email sent!", info });
  } catch (error) {
    console.error("Error sending email:", error);
    // res.status(500).json({ message: "Failed to send email", error });
  }

  //   return {
  //     minLat: lat - latDelta,
  //     maxLat: lat + latDelta,
  //     minLon: lng - lonDelta,
  //     maxLon: lng + lonDelta,
  //   };
};

module.exports = sendMail;
