const express = require("express");
const app = express();
const { Client } = require("@microsoft/microsoft-graph-client");
require("dotenv").config();

const {
  PublicClientApplication,
  ConfidentialClientApplication,
} = require("@azure/msal-node");

const outlookRouter = express.Router();

const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const tenantId = process.env.AZURE_TENANT_ID;
const redirectUri = "http://localhost:4400/callback";
const scopes = ["https://graph.microsoft.com/.default"];
let aceesToken;
const msalConfig = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri
  },
  cache:{
    cachelocation:"sessionStorage",
    storeAuthStateInCookie: false
  }
};

const pca = new PublicClientApplication(msalConfig);

const ccaConfig = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    clientSecret,
  },
};

const cca = new ConfidentialClientApplication(ccaConfig);

outlookRouter.get("/signin", (req, res) => {
  const authCodeUrlParameters = {
    scopes,
    redirectUri,
  };

  cca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
    res.redirect(response);
  });
});

// Callback route for handling authorization code
outlookRouter.get("/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Authorization code missing.");
  }
  // console.log(code)

  try {
    const tokenRequest = {
      clientId,
      code,
      scopes,
      redirectUri,
      clientSecret: clientSecret,
    };
    console.log("Token Request:", tokenRequest);
    const response = await cca.acquireTokenByCode(tokenRequest);
    req.session.accessToken = response.accessToken;
    accessToken = response.accessToken;
    console.log(accessToken);
    res.redirect("/get-access-token");
  } catch (error) {
    console.error("Error exchanging authorization code:", error.message);
    console.log(error);
    res.status(500).send("Error exchanging authorization code.");
  }
});

// Route for acquiring client access token
let clientAccessToken;
outlookRouter.get("/get-access-token", async (req, res) => {
  try {
    const tokenRequest = {
      scopes,
      clientSecret,
    };

    const response = await cca.acquireTokenByClientCredential(tokenRequest);
    req.session.clientAccessToken = response.accessToken;
    clientAccessToken = response.accessToken;
    console.log(clientAccessToken);
    res.send("Access token acquired successfully!");
  } catch (error) {
    console.error("Error acquiring client access token:", error.message);
    res.status(500).send("Error acquiring client access token.");
  }
});

outlookRouter.use("/get-mails/:num", async (req, res) => {
  const num = req.params.num;

  try {
    const userAccessToken = accessToken;
    const clientAccess = clientAccessToken;
    console.log(userAccessToken)
    console.log(clientAccess)
    if (!userAccessToken) {
      return res
        .status(401)
        .send("User not authenticated. Please sign in first.");
    }

    if (!clientAccess) {
      return res
        .status(401)
        .send(
          "Client not authenticated. Please acquire the client access token first."
        );
    }

    const client = Client.clientAccessToken({
      authProvider: (done) => {
        done(null, userAccessToken);
      },
    });

    const messages = await client.api("/me/messages").top(num).get();
    res.send(messages);
  } catch (error) {
    res.status(500).send(error);
    console.log("Error fetching messages:", error.message);
  }
});

outlookRouter.use("/send-mail/:recipient", async (req, res) => {
  const recipient = req.params.recipient;

  try {
    // Retrieve the user and client access tokens from the session
    const userAccessToken = req.session.accessToken;
    const clientAccessToken = req.session.clientAccessToken;

    // Check if the user and client are authenticated
    if (!userAccessToken) {
      return res
        .status(401)
        .send("User not authenticated. Please sign in first.");
    }

    if (!clientAccessToken) {
      return res
        .status(401)
        .send(
          "Client not authenticated. Please acquire the client access token first."
        );
    }

    // Initialize the Microsoft Graph API client using the user access token
    const client = Client.init({
      authProvider: (done) => {
        done(null, userAccessToken);
      },
    });

    // Prepare the email data
    const sendMail = {
      message: {
        subject: "Wanna go out for lunch?",
        body: {
          contentType: "Text",
          content: "I know a sweet spot that just opened around us!",
        },
        toRecipients: [
          {
            emailAddress: {
              address: recipient,
            },
          },
        ],
      },
      saveToSentItems: false,
    };

    // Send the email using the Microsoft Graph API
    const response = await client.api("/me/sendMail").post(sendMail);
    res.send(response);
  } catch (error) {
    res.status(500).send(error);
    console.log("Error sending message:", error.message);
  }
});

module.exports = {
  outlookRouter,
};
