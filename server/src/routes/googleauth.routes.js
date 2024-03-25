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
      emailContent = `If the email mentions they are interested to know more, your reply should ask them if they are willing to hop on to a demo call by suggesting a time from your end.
                        write a small text on above request in around 100-150 words`;
      mailOptions.subject = `User is : ${data.label}`;
    } else if (data.label === "Not Interested") {
      emailContent = `If the email mentions they are not interested, your reply should ask them for feedback on why they are not interested.
                        write a small text on above request in around 50 -70 words`;
      mailOptions.subject = `User is : ${data.label}`;
    } else if (data.label === "More information") {
      emailContent = `If the email mentions they are interested to know more, your reply should ask them if they can give some more information whether they are interested or not as it's not clear from their previous mail.
                        write a small text on above request in around 70-80 words`;
      mailOptions.subject = `User wants : ${data.label}`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0301",
      max_tokens: 60,
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
          <img src="" alt="reachinbox">
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
  getUser
};
