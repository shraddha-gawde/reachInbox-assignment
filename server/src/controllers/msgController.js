const axios = require("axios");
const express = require("express");
const {connection, redisGetToken} = require("../middlewares/redis.middleware");
const { createConfig } = require("../helpers/utils");
const { google } = require("googleapis");
const nodemailer = require("nodemailer");
const constants = require("../constants");
require("dotenv").config();
const OpenAI = require("openai");
const { Queue } = require("bullmq");
const googleRouter = express.Router();
const { OAuth2Client } = require("google-auth-library");
// const { redisGetToken } = require("../middlewares")


const oAuth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});


const scopes = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
  // "https://www.googleapis.com/auth/gmail.metadata",
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
  console.log(code);
  if (!code) {
    return res.status(400).send("Authorization code missing.");
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);

    const { access_token, refresh_token, scope } = tokens;
    console.log(tokens);
    accessToken = access_token; // Assign the access token to the accessToken variable

    // connection.setex(email, 3600, accessToken);
    console.log(accessToken);
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




// const connection = new Redis(
//   {
//     port: process.env.redis_port,
//     host: process.env.redis_host,
//     password: process.env.redis_pass,
//   },
//   {
//     maxRetriesPerRequest: null,
//   }
// );

const sendMailQueue = new Queue("email-queue", { connection });

async function init(body) {
  console.log(body);
  const res = await sendMailQueue.add(
    "Email to the selected User",
    {
      from: body.from,
      to: body.to,
      id: body.id,
    },
    { removeOnComplete: true }
  );
  console.log("Job added to queue", res.id);
}

oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});




const openai = new OpenAI({ apiKey: process.env.OPENAI_SECRECT_KEY });

const getUser = async (req, res) => {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/profile`;
    console.log(accessToken)
    const token = accessToken;
    connection.setex(req.params.email, 3600, token);
    // const  token  =process.env.token;
    console.log(`hiiii ${token} this is token`)
    if (!token) {
      return res.send("Token not found , Please login again to get token");
    }
    const config = createConfig(url, token);
    console.log(config);
    const response = await axios(config);
    console.log(response);
    res.json(response.data);
  } catch (error) {
    console.log("Can't get user email data ", error.message);
    res.send(error.message);
    console.log(error)
  }
};

const getDrafts = async (req, res) => {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/drafts`;
    // const { token } = await oAuth2Client.getAccessToken();
    // const  token  =process.env.token;
    const token = await redisGetToken(req.params.email);
    console.log(token);
    // const token = accessToken;
    console.log(token)
    if (!token) {
      return res.send("Token not found , Please login again to get token");
    }
    const config = createConfig(url, token);
    console.log(config)
    const response = await axios(config);
    console.log(response)
    res.json(response.data);
  } catch (error) {
    res.send(error.message)
    console.log("Can't get drafts ", error.message);
  }
};

const readMail = async (req, res) => {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/messages/${req.params.message}`;
    // const { token } = await oAuth2Client.getAccessToken();
    // const  token  =process.env.token;
    // const token = accessToken;
    const token = await redisGetToken(req.params.email);
    console.log(token)
    if (!token) {
      return res.send("Token not found , Please login again to get token");
    }
    const config = createConfig(url, token);
    const response = await axios(config);
    let data = await response.data;
    res.json(data);
  } catch (error) {
    res.send(error.message)
    console.log(error)
    console.log("Can't read mail ", error.message);
    
  }
};

const getMails = async (req, res) => {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/messages?maxResults=50`;
    // const { token } = await oAuth2Client.getAccessToken();
    // const  token  =process.env.token;
    // const token = accessToken;
    const token = await redisGetToken(req.params.email);
    if (!token) {
      return res.send("Token not found , Please login again to get token");
    }
    const config = createConfig(url, token);
    const response = await axios(config);
    res.json(response.data);
  } catch (error) {
    res.send(error.message)
    console.log("Can't get emails ", error.message);
  }
};

const sendMail = async (data) => {
  try {
    console.log("data : ", data);
    // const { token } = await oAuth2Client.getAccessToken();
    // const token =process.env.token;
    // const token = accessToken;
    const token = "ya29.a0Ad52N39MgRqIxY2MOH9xryrixPy3Z7_gCv9KCeZYwqCX2cB0r__paWOwJGN5G6p7tgscwis1c-gjBhlGrGPOnRFFNLJky2wox3Th1hX2SiVPWGSSyOT_2bS4u16BouOCclzlKrxjTZ4FvD9y3gt10jgttanZvN7wK279aCgYKAfwSARESFQHGX2Mimz3EZwIkxq1vuKEdIfyWyw0171";
    if (!token) {
      throw new Error("Token not found , Please login again to get token");
    }
    
    const transport = nodemailer.createTransport({
      host:'smtp.gmail.com',
      port:587,
      auth: {
        user: "shraddha.gawde1999@gmail.com",
        pass: "jmed ynzj eyfn jwbe",
    },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: "shraddha.gawde1999@gmail.com",
      to: "piu.gawde051999@gmail.com",
      subject: "Hello from gmail API using NodeJS",
      text: "Hello from gmail email using API",
      html: "<h1>Hello from gmail email using API</h1>",
    };
    mailOptions.from = data.from;
    mailOptions.to = data.to;

    if (data.label === "Interested") {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0301",
        max_tokens: 60,
        temperature: 0.5,
        messages: [
          {
            role: "user",
            content: `If the email mentions they are interested to know more, your reply should ask them if they are willing to hop on to a demo call by suggesting a time.
                    write a small text on above request in around 50 -70 words`,
          },
        ],
      });
      console.log(response.choices[0]);
      mailOptions.subject = `User is : ${data.label}`;
      mailOptions.text = `${response.choices[0].message.content}`;
      mailOptions.html = `<p>${response.choices[0].message.content}</p>
                                <img src="" alt="reachinbox">`;
      const result = await transport.sendMail(mailOptions);
      return result;
    } else if (data.label === "Not Interested") {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0301",
        max_tokens: 60,
        temperature: 0.5,
        messages: [
          {
            role: "user",
            content: `If the email mentions they are not interested, your reply should ask them for feedback on why they are not interested.
                    write a small text on above request in around 50 -70 words`,
          },
        ],
      });
      console.log(response.choices[0]);
      mailOptions.subject = `User is : ${data.label}`;
      mailOptions.text = `${response.choices[0].message.content}`;
      mailOptions.html = `<p>${response.choices[0].message.content}</p>
            <img src="" alt="reachinbox">`;
      const result = await transport.sendMail(mailOptions);
      return result;
    } else if (data.label === "More information") {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0301",
        max_tokens: 60,
        temperature: 0.5,
        messages: [
          {
            role: "user",
            content: `If the email mentions they are interested to know more, your reply should ask them if they can
                    give some more information whether they are interested or not as it's not clear from their previous mail.
                    write a small text on above request in around 70-80 words`,
          },
        ],
      });
      console.log(response.choices[0]);
      mailOptions.subject = `User wants : ${data.label}`;
      mailOptions.text = `${response.choices[0].message.content}`;
      mailOptions.html = `<p>${response.choices[0].message.content}</p>
                <img src="" alt="reachinbox">`;
      const result = await transport.sendMail(mailOptions);
      return result;
    }
  } catch (error) {
    console.log("Can't send email ", error.message);
    
  }
};

const parseAndSendMail = async (data1) => {
  try {
    console.log("body is :", data1);
    const { from, to } = data1;
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
    const message = await gmail.users.messages.get({
      userId: "me",
      id: data1.id,
      format: "full",
    });
    const payload = message.data.payload;
    const headers = payload.headers;
    const subject = headers.find((header) => header.name === "Subject")?.value;

    let textContent = "";
    if (payload.parts) {
      const textPart = payload.parts.find(
        (part) => part.mimeType === "text/plain"
      );
      if (textPart) {
        textContent = Buffer.from(textPart.body.data, "base64").toString(
          "utf-8"
        );
      }
    } else {
      textContent = Buffer.from(payload.body.data, "base64").toString("utf-8");
    }
    let snippet = message.data.snippet;
    const emailContext = `${subject} ${snippet} ${textContent} `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0301",
      max_tokens: 60,
      temperature: 0.5,
      messages: [
        {
          role: "user",
          content: `based on the following text  just give one word answer, Categorizing the text based on the content and assign a label from the given options -
            Interested,
            Not Interested,
            More information. text is : ${emailContext}`,
        },
      ],
    });

    const prediction = response.choices[0]?.message.content;
    console.log(
      "response.choices[0].message.content",
      response.choices[0].message.content
    );
    console.log("prediction", prediction);
    let label;
    switch (prediction) {
      case "Interested":
        label = "Interested";
        break;
      case "Not Interested":
        label = "Not Interested";
        break;
      case "More information.":
        label = "More information";
        break;
      default:
        label = "Not Sure";
    }

    const data = {
      subject,
      textContent,
      snippet: message.data.snippet,
      label,
      from,
      to,
    };
    await sendMail(data);
  } catch (error) {
    console.log("Can't fetch email ", error.message);
  }
};

const sendMailViaQueue = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.body;
    init({ from, to, id });
  } catch (error) {
    console.log("Error in sending mail via queue", error.message);
  }
  res.send("Mail processing has been queued.");
};

const sendMultipleEmails = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.body;
    for (let i = 0; i < to.length; i++) {
      await init({ from, to: to[i], id });
    }
  } catch (error) {
    console.log("Error in sending multiple emails", error.message);
  }
};

module.exports = {
  getUser,
  sendMail,
  getDrafts,
  readMail,
  getMails,
  parseAndSendMail,
  sendMailViaQueue,
  sendMultipleEmails,
  googleRouter
};
