const express = require('express');
const app = express();
const outlookRouter = express.Router();
const {
    handleAuthorization,
    getMailsFromOutlook,
    signInOutlook,
    getAccessTokenFromOutlook
} = require('../controllers/outlookController');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Outlook Routes
outlookRouter.get('/signin', signInOutlook);
outlookRouter.get('/', handleAuthorization);
outlookRouter.get('/get-access-token', getAccessTokenFromOutlook);
outlookRouter.get('/get-mails/:num', getMailsFromOutlook);

module.exports = {outlookRouter};
