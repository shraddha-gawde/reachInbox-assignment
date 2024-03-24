const express = require('express');
const router = express.Router();
const { getUser, sendMail, getDrafts, readMail, getMails, parseAndSendMail, sendMailViaQueue, sendMultipleEmails } = require('../controllers/msgController');

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get('/user/:email', getUser);

router.post('/send', async (req, res) => {
    try {
      const result = await sendMail(req.body);
      res.status(200).json({ message: "Email sent successfully", result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
router.get('/drafts/:email', getDrafts);
router.get('/read/:email/message/:message', readMail);
router.get('/list/:email', getMails);

// AutomatedRoutes
router.post('/readdata/:id', sendMailViaQueue);
router.post('/sendmulti/:id', sendMultipleEmails);

// MessageRoutes outlook (if any)

module.exports = router;
 