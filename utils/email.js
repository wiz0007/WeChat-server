import nodemailer from "nodemailer";

const cleanEnvValue = (value, { removeWhitespace = false } = {}) => {
  if (!value) return "";

  const withoutComment = value.split("#")[0].trim();
  return removeWhitespace ? withoutComment.replace(/\s+/g, "") : withoutComment;
};

const getMailConfig = () => {
  const user = cleanEnvValue(process.env.GMAIL_USER);
  const pass = cleanEnvValue(process.env.GMAIL_APP_PASSWORD, {
    removeWhitespace: true,
  });

  return { user, pass };
};

export const isEmailConfigured = () => {
  const { user, pass } = getMailConfig();
  return Boolean(user && pass);
};

export const sendEmail = async ({ to, subject, html }) => {
  const { user, pass } = getMailConfig();

  if (!user || !pass) {
    const error = new Error("Email service is not configured");
    error.code = "EMAIL_NOT_CONFIGURED";
    throw error;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"WeChat App" <${user}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent:", to);
    return true;
  } catch (err) {
    console.error("Nodemailer Error:", err);
    const error = new Error("Email send failed");
    error.code = "EMAIL_SEND_FAILED";
    throw error;
  }
};
