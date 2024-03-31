const axios = require("axios");
require("dotenv").config()
var options = {
  method: 'POST',
  url: 'https://oauth2.googleapis.com/token',
  headers: {'content-type': 'application/x-www-form-urlencoded'},
  data: new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    code: '4/0AeaYSHDS9CE9BtWxbNYokh7CvJeIFdIhtTWjvcsu_ffdGphZSq3oh0LSng7R5_ez1nvpDQ',
    redirect_uri: 'https://reachinbox-assignment-4rf9.onrender.com/auth/google/callback'
  })
};

axios.request(options).then(function (response) {
  console.log(response.data);
}).then(data=>console.log(data))
.catch(function (error) {
  console.error(error);
});
