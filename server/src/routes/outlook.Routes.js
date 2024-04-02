const express = require('express');
const app = express();
const outlookRouter = express.Router();
const {
    signin,
    callback,
    getMails,
    readMail,
    getUser,
    sendMail
} = require('../controllers/outlookController');
const { sendOutlookMailViaQueue } = require("../controllers/outlook.queue")
const { connection, redisGetToken } = require("../middlewares/redis.middleware");
outlookRouter.use(express.json());
outlookRouter.use(express.urlencoded({ extended: true }));

// Outlook Routes
outlookRouter.get('/signin', signin);
outlookRouter.get('/callback', callback);
outlookRouter.get('/profile', getUser);
outlookRouter.get('/all-Mails/:email', getMails);
outlookRouter.get('/:email/read-Msg/:message', readMail);

outlookRouter.post("/:email/send-Mail", async (req, res) => {
    try {
        const token = await redisGetToken(req.params.email);
      const result = await sendMail(req.body, token);
      res.status(200).json({ message: "Email sent successfully", result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  outlookRouter.post("/sendone/:email/:id", sendOutlookMailViaQueue)
  // });
  // outlookRouter.post("/sendone/:email/:id", sendOutlookMailViaQueue);
module.exports = outlookRouter;
