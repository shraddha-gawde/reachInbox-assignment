const { Worker } = require('bullmq');
const { connection, redisGetToken } = require("./middlewares/redis.middleware");
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const constants = require('./constants');
require('dotenv').config();
const { default: OpenAI } = require('openai');
const axios = require("axios")
// const {connection, redisGetToken} = require("./middlewares/redis.middleware");
const { createConfig } = require("./helpers/utils");
// const connection = new Redis(
//   {
//     port: process.env.redis_port,
//     host: process.env.redis_host,
//     password: process.env.redis_pass,
//   }, {
//   maxRetriesPerRequest: null
// });

const oAuth2Client = new google.auth.OAuth2({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI
});
oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const openai = new OpenAI({ apiKey: process.env.OPENAI_SECRECT_KEY });

let hardCodedReply = true;
const sendMail = async (data) => {
  try {
    const token = await redisGetToken(data.to);
    // const { token } = await oAuth2Client.getAccessToken();
    console.log(token)
    if (!token) { throw new Error("Token not found, Please login again to get token"); }
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
      from: data.from,
      to: data.to,
      subject: 'Hello from gmail API using NodeJS',
      text: 'Hello from gmail email using API',
      html: '<h1>Hello from gmail email using API</h1>'
    };

    let response;
    if (!hardCodedReply) {
      response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0301",
        max_tokens: 60,
        temperature: 0.5,
        messages: [{
          role: "user", content: `If the email mentions they are interested to know more, your reply should ask them if they are willing to hop on to a demo call by suggesting a time.
                  write a small text on above request in around 50 -70 words`
        }],
      });
    }

    if (data.label === 'Interested') {
      mailOptions.subject = `User is : ${data.label}`;
      mailOptions.text = hardCodedReply ? `Thank you for your email expressing interest in knowing more about our product/service. However, it is not clear from your previous mail whether you are interested or not. Could you please provide us with some more information? This will help us understand your requirements better and provide you with relevant information.` : `${response.choices[0].message.content}`;
      mailOptions.html = `<p>${mailOptions.text}</p><img src="" alt="reachinbox">`;
    } else if (data.label === 'Not Interested') {
      mailOptions.subject = `User is : ${data.label}`;
      mailOptions.text = hardCodedReply ? `Thank you for considering our offering. We respect your decision. Could you kindly share feedback on why our product/service did not align with your needs? Your insights are invaluable as we strive to improve our offerings. Looking forward to hearing from you.` : `${response.choices[0].message.content}`;
      mailOptions.html = `<p>${mailOptions.text}</p><img src="" alt="reachinbox">`;
    } else if (data.label === 'More information') {
      mailOptions.subject = `User wants : ${data.label}`;
      mailOptions.text = hardCodedReply ? `Thank you for your interest in our product/service! We appreciate your enthusiasm. Could you please provide more details on your level of interest? Your previous email was positive, and we want to ensure we tailor our response accordingly. Any additional insights you can share would be greatly helpful. Looking forward to hearing more from you!` : `${response.choices[0].message.content}`;
      mailOptions.html = `<p>${mailOptions.text}</p><img src="" alt="reachinbox">`;
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
    // const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    
    // const message = axios.get(`https://gmail.googleapis.com/gmail/v1/users/${to}/messages/${data1.id}`)
    const token = await redisGetToken(to)
    const url1 = `https://gmail.googleapis.com/gmail/v1/users/${to}/messages/${data1.id}`;
    const config = createConfig(url1, token);
    const message = await axios(config);
    
    // const message = await gmail.users.messages.get({
    //   userId: 'me',
    //   id: data1.id,
    //   format: 'full'
    // });


    const payload = message.data.payload;
    const headers = payload.headers;
    const subject = headers.find((header) => header.name === 'Subject')?.value;

    let textContent = '';
    if (payload.parts) {
      const textPart = payload.parts.find((part) => part.mimeType === 'text/plain');
      if (textPart) {
        textContent = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    } else {
      textContent = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
    let snippet = message.data.snippet;
    let emailContext = `${subject} ${snippet} ${textContent} `;
    let emailContextUpdated = emailContext.slice(0, 4000);

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0301",
      max_tokens: 60,
      temperature: 0.5,
      messages: [{
        role: "user", content: `based on the following text  just give one word answer, Categorizing the text based on the content and assign a label from the given options - Interested, Not Interested, More information. text is : ${emailContextUpdated}`
      }],
    });

    const prediction = response.choices[0]?.message.content;
    console.log(prediction)
    let label;
    if (prediction.includes("Not Interested")) {
      label = 'Not Interested';
    }
    else if (prediction.includes("info")) {
      label = 'More information';
    }
    else {
      label = 'Interested';
    }

    const data = { subject, textContent, snippet: message.data.snippet, label, from, to };
    console.log(data);
    const dataFromMail = await sendMail(data);
    return dataFromMail;
  } catch (error) {
    console.log("Can't fetch email ", error.message);
    // console.log(error)
    return -1;
  }
};

const sendEmail = (data, jobID) => new Promise(async (req, res) => {
  let helo = await parseAndSendMail(data);
  if (helo) {
    console.log(`Job ${jobID} completed and sent to ${data.to}`);
  }

  return helo;

}).then(res => console.log(res)).catch(err => console.log(err));


const mailWorker = new Worker('email-queue', async (job) => {
    const { from, to, id, jobId } = job.data;

    console.log(`Job ${job.id} has started`);
  const result = setTimeout(async () => {
    await sendEmail(job.data, job.id);
  }, 5000);
  console.log("Job in progress");
}, { connection });