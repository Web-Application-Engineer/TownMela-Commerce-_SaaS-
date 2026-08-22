"use strict";

const nodemailer = require("nodemailer");

const createTransporter = () => {
  const host = String(
    process.env.SMTP_HOST || ""
  ).trim();

  const port = Number(
    process.env.SMTP_PORT || 587
  );

  const user = String(
    process.env.SMTP_USER || ""
  ).trim();

  const pass = String(
    process.env.SMTP_PASS || ""
  ).trim();

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP email service is not configured"
    );
  }

  const secure =
    String(
      process.env.SMTP_SECURE || ""
    )
      .trim()
      .toLowerCase() === "true" ||
    port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
};

const sendEmail = async ({
  to,
  subject,
  text,
  html,
  fromName,
}) => {
  const transporter =
    createTransporter();

  const defaultFrom =
    String(
      process.env.MAIL_FROM ||
        process.env.SMTP_USER ||
        ""
    ).trim();

  const smtpUser =
    String(
      process.env.SMTP_USER ||
        ""
    ).trim();

  if (!defaultFrom) {
    throw new Error(
      "MAIL_FROM is not configured"
    );
  }

  const cleanFromName =
    String(
      fromName || ""
    )
      .replace(
        /[\r\n]+/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  const from =
    cleanFromName &&
    smtpUser
      ? {
          name:
            cleanFromName,

          address:
            smtpUser,
        }
      : defaultFrom;

  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

module.exports = sendEmail;
