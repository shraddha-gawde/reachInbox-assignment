require("dotenv").config();
const { google } = require('googleapis');
const express = require('express');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const port = 8080;

const oAuth2Client = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
});
// 'https://www.googleapis.com/auth/gmail.readonly'
const scopes = ['https://www.googleapis.com/auth/gmail.readonly',
'https://www.googleapis.com/auth/gmail.compose',
'https://www.googleapis.com/auth/gmail.modify'
];

app.get('/auth/google', (req, res) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline', 
        scope: scopes,
    });
    res.redirect(authUrl);
});

// Handle the redirect URI after the user grants permission
app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    console.log(code)
    if (!code) {
        return res.status(400).send('Authorization code missing.');
    }

    try {
        const { tokens } = await oAuth2Client.getToken(code);
        const { access_token, refresh_token, scope } = tokens;
        console.log(tokens);
        // Check if the returned scope includes the restricted scopes
        if (scope.includes(scopes.join(' '))) {
            res.send('Restricted scopes test passed.');
        } else {
            res.send('Restricted scopes test failed: Scopes are not restricted.');
        }
    } catch (error) {
        console.error('Error exchanging authorization code:', error.message);
        res.status(500).send('Error exchanging authorization code.');
    }
});

// Start the Express server
app.listen(4400, () => {
    console.log(`Server running on http://localhost:${port}`);
})