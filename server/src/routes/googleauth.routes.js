const axios = require("axios");
const express = require("express");
require("dotenv").config();
const { createConfig } = require("../helpers/utils");
const { OAuth2Client } = require("google-auth-library");
const { connection } = require("../middlewares/redis.middleware");
const googleRouter = express.Router();
const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_SECRECT_KEY });

// google oauth
const oAuth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});

const scopes = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
];

googleRouter.get("/auth/google", (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });
  res.redirect(authUrl);
});

let accessToken;
googleRouter.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Authorization code missing.");
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);

    const { access_token, refresh_token, scope } = tokens;

    accessToken = access_token;

    if (scope.includes(scopes.join(" "))) {
      res.send("Restricted scopes test passed.");
    } else {
      res.send("Restricted scopes test failed: Scopes are not restricted.");
    }
  } catch (error) {
    console.error("Error exchanging authorization code:", error.message);
    res.status(500).send("Error exchanging authorization code.");
  }
});

// git user profile details
const getUser = async (req, res) => {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/profile`;

    const token = accessToken;
    connection.setex(req.params.email, 3600, token);

    if (!token) {
      return res.send("Token not found , Please login again to get token");
    }

    const config = createConfig(url, token);

    const response = await axios(config);

    res.json(response.data);
  } catch (error) {
    console.log("Can't get user email data ", error.message);
    res.send(error.message);
  }
};

//
// const sendMail = async (data, token) => {
//   try {
//     // const Token = accessToken;
//     if (!token) {
//       throw new Error("Token not found, please login again to get token");
//     }

//     const mailOptions = {
//       from: data.from,
//       to: data.to,
//       subject: "",
//       text: "",
//       html: "",
//     };
//     let emailContent = "";
//     if (data.label === "Interested") {
//       // Advertisement prompt
//       emailContent = `If the email mentions they are interested, do not generate any recipant's name instead use Dear user, your reply should give this advertisement i have express some key points below user then and create good reply for advertivement it shold render on email in bullet points
//       <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px;">
//       <p>We're excited to share with you how our product can benefit you:</p>
//       <ul>
//         <li><strong>Secure Mailing:</strong> Our platform offers end-to-end encryption to ensure your emails remain private and secure.</li>
//         <li><strong>Automated Emails:</strong> Easily automate your email workflows by setting timers and triggers. Schedule emails to be sent at specific times or based on user actions.</li>
//         <li><strong>Customizable Templates:</strong> Create personalized email templates and automate repetitive tasks, saving you time and effort.</li>
//       </ul>
//       <p>Would you like to learn more about how our platform can streamline your email communication? Feel free to reply to this email.</p>
//     </div>`;

//       mailOptions.subject = `User is : ${data.label}`;
//     } 
    
//     else if (data.label === "Not Interested") {
//       emailContent = `If the email mentions they are not interested, create a reply where we should ask them for feedback on why they are not interested. do not generate any recipant's name instead use Dear user.
//         Write a small text on the above request in around 100-150 words`;
//       mailOptions.subject = `User is : ${data.label}`;
//     } 
    
//     else if (data.label === "More Information") {
//       emailContent = `
//       If the email mentions they are interested to know more, your reply should give them more information about this product. Here are some of its key features:<br><br>
//       use this as heading for my reply. make it in bullet points but give style as none.
//       Thank you for expressing interest in our product! We're thrilled to share more details with you:

//       <p>Our product is a comprehensive email management platform designed to streamline your communication workflows.</p>
//       here are some features and benefits we can provide for user

//       <ul>
//       <li><strong>Google Authentication:</strong> Allow users to authenticate using their Google accounts.</li>
//       <li><strong>View User Profile:</strong> Retrieve and display user profile information such as name, email, and profile picture.</li>
//       <li><strong>View All Drafts:</strong> Fetch and display a list of all draft emails associated with the user's email address.</li>
//       <li><strong>Read Specific Email:</strong> Retrieve and display the content of a specific email using its ID.</li>
//       <li><strong>List Mails:</strong> Fetch and display a list of all emails associated with the user's email address.</li>
//       <li><strong>Send Email with Label:</strong> Allow users to send emails with a specified label (e.g., "Interested", "Not Interested", "More Information").</li>
//     </ul>
//         <strong>Send Email with Label:</strong> Allow users to send emails with a specified label (e.g., "Interested", "Not Interested", "More Information").`;

//       mailOptions.subject = `User wants : ${data.label}`;
//     }

//     const response = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo-0301",
//       max_tokens: 350,
//       temperature: 0.5,
//       messages: [
//         {
//           role: "user",
//           content: emailContent,
//         },
//       ],
//     });


//     const [heading, features, benefits] = response.choices[0].message.content.split('\n\n');

//     const headingHTML = `<h2>${heading}</h2>`;

//     const featuresHTML = `<ul style="list-style: none">${features.split('\n').map(feature => `<li style="list-style: none">${feature}</li>`).join('')}</ul>`;
//     const benefitsHTML = `<ul style="list-style: none">${benefits.split('\n').map(feature => `<li style="list-style: none">${feature}</li>`).join('')}</ul>`;

//     mailOptions.text = `${heading}\n\n${features}`;
//     mailOptions.html = `
//       <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; ">
//         ${headingHTML}
//         ${featuresHTML}
//         ${benefitsHTML}
//       </div>`;

//       const emailData = [
//         'Content-type: text/html;charset=iso-8859-1',
//         'MIME-Version: 1.0',
//         `from: ${data.from}`,
//         `to: ${data.to}`,
//         `subject: ${mailOptions.subject}`,
//         `text: ${mailOptions.text}`,
//         `html: ${mailOptions.html}`,
//   ].join('\n');


  
//       const sendMessageResponse = await axios.post(`https://gmail.googleapis.com/gmail/v1/users/${data.from}/messages/send`,{raw:Buffer.from(emailData).toString(`base64`)}, {
//         headers: {
//           "Content-Type" : "application/json",
//           'Authorization': `Bearer ${token}`
//         }
//       });
      

//     let labelId;
//     switch (data.label) {
//       case "Interested":
//         labelId = "Label_1";
//         break;
//       case "Not Interested":
//         labelId = "Label_2";
//         break;
//       case "More Information":
//         labelId = "Label_3";
//         break;
//       default:
//         break;
//     }

//     const labelUrl = `https://gmail.googleapis.com/gmail/v1/users/${data.from}/messages/${sendMessageResponse.data.id}/modify`;
//     const labelConfig = {
//       method: 'POST',
//       url: labelUrl,
//       headers: {
//         'Authorization': `Bearer ${token}`
//       },
//       data: {
//         addLabelIds: [labelId]
//       }
//     };
//     const labelResponse = await axios(labelConfig);
    
//     console.log(sendMessageResponse.data.id)
//     return sendMessageResponse.data.id.result;
//   } catch (error) {
//     console.log(error)
//     throw new Error("Can't send email: " + error.message);
    
//   }
// };

const sendMail = async (data, token) => {
  try {
    if (!token) {
      throw new Error("Token not found, please login again to get token");
    }

    const emailContent = `dont use any name instead use dear user.here you have to create advertisement mail, your reply should provide an enticing advertisement for our ReachInbox platform. Highlight the key features and benefits to capture their interest and encourage them to learn more. Here's a suggested prompt:\n\n'Hello!\n\nWe're thrilled to introduce you to ReachInbox – the ultimate email management platform designed to streamline your communication workflows and boost your productivity.\n\nDiscover how ReachInbox can transform your email experience:\n\n- **Secure Mailing:** Rest assured that your emails are protected with state-of-the-art encryption, keeping your communication private and secure.\n\n- **Automated Emails:** Say goodbye to manual tasks! With ReachInbox, you can automate your email workflows, schedule emails, and set triggers to send messages at the perfect time.\n\n- **Customizable Templates:** Personalize your emails effortlessly! Create stunning templates tailored to your brand and audience, saving you time and effort.\n\nReady to supercharge your email productivity? Reply to this email to learn more about ReachInbox and take your communication to the next level.\n\nDon't miss out on this opportunity to revolutionize your inbox with ReachInbox. Get started today! . give this form of containers heading, features and benefits`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0301",
      max_tokens: 350,
      temperature: 0.5,
      messages: [
        {
          role: "user",
          content: emailContent,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    console.log(content)

    const mailOptions = {
      from: data.from,
      to: data.to,
      subject: `${data.label} of ReachInBox`,
      text: `${data.label} of ReachInBox`,
      html: `
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; text-align: center; font-family: Arial, sans-serif;">
          <h2 style="color: #333;">Exciting Offer from Reach-In Box!</h2>
          <p style="font-size: 16px; color: #666;">Dear valued customer,</p>
          <p style="font-size: 16px; color: #666;">${content}</p>
          <p style="font-size: 16px; color: #666;">Best regards,</p>
          <p style="font-size: 16px; color: #666;"><strong>Shraddha Gawde</strong><br>Reach-In Box</p>
        </div>`
    };

    const emailData = {
      raw: Buffer.from(
        [
          'Content-type: text/html;charset=iso-8859-1',
          'MIME-Version: 1.0',
          `from: ${data.from}`,
          `to: ${data.to}`,
          `subject: ${mailOptions.subject}`,
          `text: ${mailOptions.text}`,
          `html: ${mailOptions.html}`,
          
          
        ].join('\n')
      ).toString('base64')
    };

    const sendMessageResponse = await axios.post(`https://gmail.googleapis.com/gmail/v1/users/${data.from}/messages/send`, emailData, {
      headers: {
        "Content-Type": "application/json",
        'Authorization': `Bearer ${token}`
      }
    });

    // Modify label for the sent email
    const labelUrl = `https://gmail.googleapis.com/gmail/v1/users/${data.from}/messages/${sendMessageResponse.data.id}/modify`;
    const labelConfig = {
      method: 'POST',
      url: labelUrl,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        addLabelIds: ["Label_4"]
      }
    };
    await axios(labelConfig);

    return sendMessageResponse.data.id;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Can't send email: " + error.message);
  }
};



module.exports = {
  googleRouter,
  sendMail,
  getUser,
};
