require('dotenv');

const auth = {
    type: 'OAuth2',
    user: 'shraddha.gawde1999@gmail.com',
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN
};

const mailOptions = {
    from: 'Shraddha gawde 📩 <shraddha.gawde1999@gmail.com>',
    to: 'piu.gawde1999@gmail.com',
    subject: 'Hello from gmail API using NodeJS',
    // text: 'Hello from gmail email using API',
    // html: '<h1>Hello from gmail email using API</h1>'
};

module.exports = { auth, mailOptions };
