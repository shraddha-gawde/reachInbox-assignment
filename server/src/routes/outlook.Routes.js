const express = require('express');
// const app = express();
const outlookRouter = express.Router();
const {
    // handleAuthorization,
    // getMailsFromOutlook,
    signin,
    callback,
    getAccessToken
    // getAccessTokenFromOutlook
} = require('../controllers/outlookController');

outlookRouter.use(express.json());
outlookRouter.use(express.urlencoded({ extended: true }));

// Outlook Routes
outlookRouter.get('/signin', signin);
outlookRouter.get('/callback', callback);
outlookRouter.get('/get-access-token', getAccessToken);
// outlookRouter.get('/get-access-token', getAccessTokenFromOutlook);
// outlookRouter.get('/get-mails/:num', getMailsFromOutlook);

module.exports = outlookRouter;
