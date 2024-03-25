// const axios = require("axios");
// const { Client } = require("@microsoft/microsoft-graph-client");
// const { PublicClientApplication, ConfidentialClientApplication } = require("@azure/msal-node");

// const dotenv = require("dotenv");
// dotenv.config();

// const clientId = "be8ccf6d-93c8-480d-b2bb-88e46c2318de"; // Your Azure app's client ID
// const clientSecret = "ZJV8Q~budnjrppuw8i.O0wG8xxioe1ZuMpOdkbLD"; // Your Azure app's client secret
// const tenantId = "44f4d6b1-8db8-495e-bb3c-e62b42a19dd2"; // Your Azure app's tenant ID
// const redirectUri = "http://localhost:4400/get";
// const scopes = ["https://graph.microsoft.com/.default"];

// const Config = {
//     auth: {
//         clientId,
//         authority: `https://login.microsoftonline.com/${tenantId}`,
//         redirectUri,
//     },
// };

// const pca = new PublicClientApplication(Config);

// const ccaConfig = {
//     auth: {
//         clientId,
//         authority: `https://login.microsoftonline.com/${tenantId}`,
//         clientSecret,
//     },
// };

// const cca = new ConfidentialClientApplication(ccaConfig);

// const signInOutlook = async (req, res) => {
//     try {
//         const authCodeUrlParameters = {
//             scopes,
//             redirectUri,
//         };

//         pca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
//             res.redirect(response);
//             console.log(response)
//         });
//     } catch (error) {
//         console.log("Error signing in:", error);
//     }
// }

// const handleAuthorization = async (req, res) => {
//     try {
//         const tokenRequest = {
//             code: req.query.code,
//             scopes,
//             redirectUri,
//             clientSecret: clientSecret,
//         };

//         pca.acquireTokenByCode(tokenRequest).then((response) => {
//             req.session.accessToken = response.accessToken;

//             res.redirect("/get-access-token");
//         }).catch((error) => {
//             console.log(error);
//             res.status(500).send(error);
//         });

//     } catch (error) {
//         console.log("Error handling authorization:", error)
//     }
// }

// const getAccessTokenFromOutlook = async (req, res) => {
//     try {
//         const tokenRequest = {
//             scopes,
//             clientSecret: clientSecret,
//         };

//         const response = await cca.acquireTokenByClientCredential(tokenRequest);
//         const accessToken = response.accessToken;
//         console.log(accessToken)
//         // Store the client-specific access token in the session for future use
//         req.session.clientAccessToken = accessToken; // This will now be stored in the session

//         res.send("Access token acquired successfully!");
//     } catch (error) {
//         console.error('Error retrieving access token:', error);
//         res.status(500).json({ error: 'Failed to retrieve access token' });

//     }
// }

// const getMailsFromOutlook = async (req, res) => {
//     const num = req.params.num;

//     try {
//         const userAccessToken = req.session.accessToken;
//         const clientAccessToken = req.session.clientAccessToken;

//         // Check if the user and client are authenticated
//         if (!userAccessToken) {
//             return res.status(401).send("User not authenticated. Please sign in first.");
//         }

//         if (!clientAccessToken) {
//             return res.status(401).send("Client not authenticated. Please acquire the client access token first.");
//         }

//         // Initialize the Microsoft Graph API client using the user access token
//         const client = Client.init({
//             authProvider: (done) => {
//                 done(null, userAccessToken);
//             },
//         });

//         const messages = await client.api("/me/messages").top(num).get();
//         res.send(messages);
//     } catch (error) {
//         res.status(500).send(error);
//         console.log("Error fetching messages:", error.message);
//     }
// }

// const getUserFromOutlook = async (req, res) => {
//     // Implementation to get user from Outlook
// }

// module.exports = {
//     signInOutlook,
//     handleAuthorization,
//     getAccessTokenFromOutlook,
//     getMailsFromOutlook,
//     getUserFromOutlook
// };

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

const msalConfig = {
  auth: {
    clientId:"be8ccf6d-93c8-480d-b2bb-88e46c2318de",
    authority: "https://login.microsoftonline.com/44f4d6b1-8db8-495e-bb3c-e62b42a19dd2",
    redirectUri:"http://localhost:4400/callback"
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

  pca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
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
    const response = await pca.acquireTokenByCode(tokenRequest);
    req.session.accessToken = response.accessToken;
    console.log(response.accessToken);
    res.redirect("/get-access-token");
  } catch (error) {
    console.error("Error exchanging authorization code:", error.message);
    console.log(error);
    res.status(500).send("Error exchanging authorization code.");
  }
});

// Route for acquiring client access token
outlookRouter.get("/get-access-token", async (req, res) => {
  try {
    const tokenRequest = {
      scopes,
      clientSecret,
    };

    const response = await cca.acquireTokenByClientCredential(tokenRequest);
    req.session.clientAccessToken = response.accessToken;
    console.log(response);
    res.send("Access token acquired successfully!");
  } catch (error) {
    console.error("Error acquiring client access token:", error.message);
    res.status(500).send("Error acquiring client access token.");
  }
});

outlookRouter.use("/get-mails/:num", async (req, res) => {
  const num = req.params.num;

  try {
    const userAccessToken = req.session.accessToken;
    const clientAccessToken = req.session.clientAccessToken;
    console.log(userAccessToken)
    console.log(clientAccessToken)
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

    const client = Client.init({
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
