const { Worker } = require("bullmq");
const { connection, redisGetToken } = require("./middlewares/redis.middleware");
const { google } = require("googleapis");
const nodemailer = require("nodemailer");
require("dotenv").config();
const { default: OpenAI } = require("openai");

const { parseAndSendoutlookMail}= require("./controllers/outlook.queue")
const { parseAndSendMail } = require("./controllers/queue.controller")






const sendEmail = (data, jobID) =>
  new Promise(async (req, res) => {
    console.log(data)
    let msg = await parseAndSendMail(data, data.token);
    if (msg) {
      console.log(`Job ${jobID} completed and sent to ${data.to}`);
    }
    return msg;
  })
    .then((res) => console.log(res))
    .catch((err) => console.log(err));

const mailWorker = new Worker("email-queue", async (job) => {
    const { from, to, id, token, jobId } = job.data;

    console.log(`Job ${job.id} has started`);
    const result = setTimeout(async () => {
      await sendEmail(job.data, job.id);
    }, 5000);
    console.log("Job in progress");
  },
  { connection }
);


const sendoutlookmail = (data, jobID) =>
  new Promise(async (req, res) => {
   
    let msg = await parseAndSendoutlookMail(data, data.token);
    
    if (msg) {
      console.log(`Job ${jobID} completed and sent to ${data.to}`);
    }
    return msg;
  })
    .then((res) => console.log(res))
    .catch((err) => console.log(err));

const outlookmailWorker = new Worker("outlook-queue", async (job) => {
    const { from, to, id, jobId } = job.data;
  
    console.log(`Job ${job.id} has started`);
    const result = setTimeout(async () => {
      await sendoutlookmail(job.data, job.id);
    }, 5000);
    console.log("Job in progress");
  },
  { connection }
);

