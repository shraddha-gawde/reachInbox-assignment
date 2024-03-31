const axios = require("axios");
const express = require("express");
require("dotenv").config();
const { createConfig } = require("../helpers/utils");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library");
const { connection } = require("../middlewares/redis.middleware");
const googleRouter = express.Router();
const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_SECRECT_KEY });

// google oauth
const oAuth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});

const scopes = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
];

googleRouter.get("/auth/google", (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });
  res.redirect(authUrl);
});

let accessToken;
googleRouter.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Authorization code missing.");
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);

    const { access_token, refresh_token, scope } = tokens;

    accessToken = access_token;

    if (scope.includes(scopes.join(" "))) {
      res.send("Restricted scopes test passed.");
    } else {
      res.send("Restricted scopes test failed: Scopes are not restricted.");
    }
  } catch (error) {
    console.error("Error exchanging authorization code:", error.message);
    res.status(500).send("Error exchanging authorization code.");
  }
});

// git user profile details
const getUser = async (req, res) => {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/profile`;

    const token = accessToken;
    connection.setex(req.params.email, 3600, token);

    if (!token) {
      return res.send("Token not found , Please login again to get token");
    }

    const config = createConfig(url, token);

    const response = await axios(config);

    res.json(response.data);
  } catch (error) {
    console.log("Can't get user email data ", error.message);
    res.send(error.message);
  }
};

//
const sendMail = async (data) => {
  try {
    const Token = accessToken;
    if (!Token) {
      throw new Error("Token not found, please login again to get token");
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_host,
      port: process.env.SMTP_port,
      auth: {
        user: process.env.SMTP_mail,
        pass: process.env.SMTP_pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: data.from,
      to: data.to,
      subject: "",
      text: "",
      html: "",
    };

    let emailContent = "";
    if (data.label === "Interested") {
      // Advertisement prompt
      emailContent = `Thank you for your interest in our product! We're excited to share with you how our product can benefit you:

- Secure Mailing: Our platform offers end-to-end encryption to ensure your emails remain private and secure.
- Automated Emails: Easily automate your email workflows by setting timers and triggers. Schedule emails to be sent at specific times or based on user actions.
- Customizable Templates: Create personalized email templates and automate repetitive tasks, saving you time and effort.

Would you like to learn more about how our platform can streamline your email communication? Feel free to reply to this email or schedule a demo with us.`;

      subject = `User is : ${data.label}`;
    } else if (data.label === "Not Interested") {
      emailContent = `If the email mentions they are not interested, your reply should ask them for feedback on why they are not interested.
                        write a small text on above request in around 100-150 words`;
      mailOptions.subject = `User is : ${data.label}`;
    } else if (data.label === "More Information") {
      // Feature list
      emailContent = `If the email mentions they are interested to know more, your reply should give them more information about this product. Here are some of its key features:

- Google Authentication: Allow users to authenticate using their Google accounts.
- View User Profile: Retrieve and display user profile information such as name, email, and profile picture.
- View All Drafts: Fetch and display a list of all draft emails associated with the user's email address.
- Read Specific Email: Retrieve and display the content of a specific email using its ID.
- List Mails: Fetch and display a list of all emails associated with the user's email address.
- Send Email with Label: Allow users to send emails with a specified label (e.g., "Interested", "Not Interested", "More Information").`;

      subject = `User wants : ${data.label}`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0301",
      max_tokens: 200,
      temperature: 0.5,
      messages: [
        {
          role: "user",
          content: emailContent,
        },
      ],
    });

    mailOptions.text = `${response.choices[0].message.content}`;
    mailOptions.html = `
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; text-align: center;">
          <p>${response.choices[0].message.content}</p>
          
        </div>`;

    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    throw new Error("Can't send email: " + error.message);
  }
};

module.exports = {
  googleRouter,
  sendMail,
  getUser,
};
