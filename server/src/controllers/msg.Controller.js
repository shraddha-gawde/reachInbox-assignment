const axios = require("axios");
const express = require("express");
const {
  connection,
  redisGetToken,
} = require("../middlewares/redis.middleware");
const { createConfig } = require("../helpers/utils");
const { google } = require("googleapis");
require("dotenv").config();
const OpenAI = require("openai");
const { Queue } = require("bullmq");
const { OAuth2Client } = require("google-auth-library");

const oAuth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});


oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_SECRECT_KEY });


const getDrafts = async (req, res) => {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/drafts`;
  
    const token = await redisGetToken(req.params.email);
    console.log(token);
  
    console.log(token);
    if (!token) {
      return res.send("Token not found , Please login again to get token");
    }
    const config = createConfig(url, token);
    console.log(config);
    const response = await axios(config);
    console.log(response);
    res.json(response.data);
  } catch (error) {
    res.send(error.message);
    console.log("Can't get drafts ", error.message);
  }
};


const readMail = async (req, res) => {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/messages/${req.params.message}`;
   
    const token = await redisGetToken(req.params.email);
    console.log(token);
    if (!token) {
      return res.send("Token not found , Please login again to get token");
    }
    const config = createConfig(url, token);
    const response = await axios(config);
    let data = await response.data;
    res.json(data);
  } catch (error) {
    res.send(error.message);
    
    console.log("Can't read mail ", error.message);
  }
};


const getMails = async (req, res) => {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/messages?maxResults=50`;
    const token = await redisGetToken(req.params.email);
    if (!token) {
      return res.send("Token not found , Please login again to get token");
    }
    const config = createConfig(url, token);
    const response = await axios(config);
    res.json(response.data);
  } catch (error) {
    res.send(error.message);
    console.log("Can't get emails ", error.message);
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

module.exports = {
  getDrafts,
  readMail,
  getMails,
  parseAndSendMail,
};
