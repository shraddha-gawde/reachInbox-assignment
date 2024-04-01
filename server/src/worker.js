const { Worker } = require("bullmq");
const { connection, redisGetToken } = require("./middlewares/redis.middleware");
const { google } = require("googleapis");
const nodemailer = require("nodemailer");
require("dotenv").config();
const { default: OpenAI } = require("openai");
const axios = require("axios");

const { createConfig } = require("./helpers/utils");


const oAuth2Client = new google.auth.OAuth2({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});
oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_SECRECT_KEY });

let hardCodedReply = true;
const sendMail = async (data) => {
  try {
    const token = await redisGetToken(data.to);
    console.log(token);
    if (!token) {
      throw new Error("Token not found, Please login again to get token");
    }

    const transport = nodemailer.createTransport({
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
      subject: "Hello from gmail API using NodeJS",
      text: "Hello from gmail email using API",
      html: "<h1>Hello from gmail email using API</h1>",
    };

    let response;
    if (!hardCodedReply) {
      response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0301",
        max_tokens: 200,
        temperature: 0.5,
        messages: [
          {
            role: "user",
            content: `If the email mentions they are interested to know more, your reply should ask them if they are willing to hop on to a demo call by suggesting a time.
                  write a small text on above request in around 50 -70 words`,
          },
        ],
      });
    }

    if (data.label === "Interested") {
      mailOptions.subject = `User is : ${data.label}`;
      mailOptions.html = `
        <div style="background-color: #f0f0f0; padding: 20px; border-radius: 10px;">
          <p>${hardCodedReply ? `<div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px;">
          <p>We're excited to share with you how our product can benefit you:</p>
          <ul>
            <li><strong>Secure Mailing:</strong> Our platform offers end-to-end encryption to ensure your emails remain private and secure.</li>
            <li><strong>Automated Emails:</strong> Easily automate your email workflows by setting timers and triggers. Schedule emails to be sent at specific times or based on user actions.</li>
            <li><strong>Customizable Templates:</strong> Create personalized email templates and automate repetitive tasks, saving you time and effort.</li>
          </ul>
          <p>Would you like to learn more about how our platform can streamline your email communication? Feel free to reply to this email.</p>
        </div>` : `${response.choices[0].message.content}`}</p>
          
        </div>`;
    }

    else if (data.label === "Not Interested") {
      mailOptions.subject = `User is : ${data.label}`;
      mailOptions.html = `
        <div style="background-color: #f0f0f0; padding: 20px; border-radius: 10px; text-align: center;">
          <p>${hardCodedReply ? `Thank you for considering our offering. We respect your decision. Could you kindly share feedback on why our product/service did not align with your needs? Your insights are invaluable as we strive to improve our offerings. Looking forward to hearing from you.` : `${response.choices[0].message.content}`}</p>
          
        </div>`;
    }

    else if (data.label === "More information") {
      mailOptions.subject = `User wants : ${data.label}`;
      mailOptions.html = `
        <div style="background-color: #f0f0f0; padding: 20px; border-radius: 10px;">
          <p>${hardCodedReply ? `Thank you for expressing interest in our product! We're thrilled to share more details with you:

          <p>Our product is a comprehensive email management platform designed to streamline your communication workflows.</p>
          here are some features and benefits we can provide for user
    
          <ul>
          <li><strong>Google Authentication:</strong> Allow users to authenticate using their Google accounts.</li>
          <li><strong>View User Profile:</strong> Retrieve and display user profile information such as name, email, and profile picture.</li>
          <li><strong>View All Drafts:</strong> Fetch and display a list of all draft emails associated with the user's email address.</li>
          <li><strong>Read Specific Email:</strong> Retrieve and display the content of a specific email using its ID.</li>
          <li><strong>List Mails:</strong> Fetch and display a list of all emails associated with the user's email address.</li>
          <li><strong>Send Email with Label:</strong> Allow users to send emails with a specified label (e.g., "Interested", "Not Interested", "More Information").</li>
        </ul>
            <strong>Send Email with Label:</strong> Allow users to send emails with a specified label (e.g., "Interested", "Not Interested", "More Information").` : `${response.choices[0].message.content}`}</p>
          
        </div>`;
    }

    const result = await transport.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.log("Can't send email ", error.message);
  }
};


const parseAndSendMail = async (data1) => {
  try {
    const { from, to } = data1;
    const token = await redisGetToken(to);
    const url1 = `https://gmail.googleapis.com/gmail/v1/users/${to}/messages/${data1.id}`;
    const config = createConfig(url1, token);
    const message = await axios(config);

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
    let emailContext = `${subject} ${snippet} ${textContent} `;
    let emailContextUpdated = emailContext.slice(0, 4000);

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0301",
      max_tokens: 60,
      temperature: 0.5,
      messages: [
        {
          role: "user",
          content: `based on the following text  just give one word answer, Categorizing the text based on the content and assign a label from the given options - Interested, Not Interested, More information. text is : ${emailContextUpdated}`,
        },
      ],
    });

    const prediction = response.choices[0]?.message.content;
    console.log(prediction);
    let label;
    if (prediction.includes("Not Interested")) {
      label = "Not Interested";
    } else if (prediction.includes("info")) {
      label = "More information";
    } else {
      label = "Interested";
    }

    const data = {
      subject,
      textContent,
      snippet: message.data.snippet,
      label,
      from,
      to,
    };
    console.log(data);
    const dataFromMail = await sendMail(data);
    return dataFromMail;
  } catch (error) {
    console.log("Can't fetch email ", error.message);
    return -1;
  }
};

const sendEmail = (data, jobID) =>
  new Promise(async (req, res) => {
    let msg = await parseAndSendMail(data);
    if (msg) {
      console.log(`Job ${jobID} completed and sent to ${data.to}`);
    }
    return msg;
  })
    .then((res) => console.log(res))
    .catch((err) => console.log(err));

const mailWorker = new Worker("email-queue", async (job) => {
    const { from, to, id, jobId } = job.data;

    console.log(`Job ${job.id} has started`);
    const result = setTimeout(async () => {
      await sendEmail(job.data, job.id);
    }, 5000);
    console.log("Job in progress");
  },
  { connection }
);
