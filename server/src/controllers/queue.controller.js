

const { connection } = require("../middlewares/redis.middleware");
require("dotenv").config();
const { Queue } = require("bullmq");


const sendMailQueue = new Queue("email-queue", { connection });

async function init(body) {

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
  
      if (Array.isArray(to)) {
        for (let i = 0; i < to.length; i++) {
          await sendEmailToQueue({ from, to: to[i], id });
        }
      } else {
        await sendEmailToQueue({ from, to, id });
      }
  
      res.send("Mail processing has been queued.");
    } catch (error) {
      console.log("Error in sending multiple emails", error.message);
      res.status(500).send("Error in sending multiple emails");
    }
  };
  const sendEmailToQueue = async ({ from, to, id }) => {
    try {
      // Enqueue a job to send the email
      await sendMailQueue.add("send-email", { from, to, id });
      console.log(`Email to ${to} has been queued.`);
    } catch (error) {
      console.error("Error enqueuing email job:", error.message);
      throw error;
    }
  };
  module.exports = {
    sendMailViaQueue,
    sendMultipleEmails,
  };