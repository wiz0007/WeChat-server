import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,         // Gmail email
        pass: process.env.GMAIL_APP_PASSWORD, // App password
      },
    });

    await transporter.sendMail({
      from: `"WeChat App" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent:", to);
    return true;
  } catch (err) {
    console.error("Nodemailer Error:", err);
    throw new Error("Email send failed");
  }
};




