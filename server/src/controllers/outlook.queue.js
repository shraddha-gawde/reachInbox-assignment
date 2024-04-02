const { connection, redisGetToken } = require("../middlewares/redis.middleware");
require("dotenv").config();
const { Queue } = require("bullmq");
const { default: OpenAI } = require("openai");
// const { sendoutlookmail } = require(".././worker")
const axios = require("axios");
const openai = new OpenAI({ apiKey: process.env.OPENAI_SECRECT_KEY });


const sendOutlookMailQueue = new Queue("outlook-queue", { connection });


async function init(body) {
  const res = await sendOutlookMailQueue.add(
    "Email to the selected User",
    {
      from: body.from,
      to: body.to,
      id: body.id,
      token: body.token
    },
    { removeOnComplete: true }
  );
  console.log("Job added to queue", res.id);
}

const sendOutlookMailViaQueue = async (req, res) => {
  try {
    const { id, email } = req.params;
    const { from, to } = req.body;
    const token = await redisGetToken(email);
    console.log(token)
    init({from, to, id, token });
  } catch (error) {
    console.log("Error in sending mail via queue", error.message);
  }
  res.send("Mail processing has been queued.");
};

const sendoutlookEmail = async (data, token) => {
    console.log(data)
  try {
    if (!token) {
      throw new Error("Token not found, please login again to get token");
    }

    let emailContent = "";
    let subject = "";
    if (data.label === "Interested") {
      emailContent = `If the email mentions they are interested, do not generate any recipient's name instead use Dear user, your reply should give this advertisement i have express some key points below user then and create good reply for advertisement it should render on email in bullet points
        
        We're excited to share with you how our product can benefit you:
        - Secure Mailing: Our platform offers end-to-end encryption to ensure your emails remain private and secure.
        - Automated Emails: Easily automate your email workflows by setting timers and triggers. Schedule emails to be sent at specific times or based on user actions.
        - Customizable Templates: Create personalized email templates and automate repetitive tasks, saving you time and effort.
  
        Would you like to learn more about how our platform can streamline your email communication? Feel free to reply to this email.`;
      subject = `User is : ${data.label}`;
    } else if (data.label === "Not Interested") {
      emailContent = `If the email mentions they are not interested, create a reply where we should ask them for feedback on why they are not interested. do not generate any recipient's name instead use Dear user. Write a small text on the above request in around 100-150 words`;
      subject = `User is : ${data.label}`;
    } else if (data.label === "More Information") {
      emailContent = `If the email mentions they are interested to know more, your reply should give them more information about this product. Here are some of its key features:
        
        Thank you for expressing interest in our product! We're thrilled to share more details with you:
        - Google Authentication: Allow users to authenticate using their Google accounts.
        - View User Profile: Retrieve and display user profile information such as name, email, and profile picture.
        - View All Drafts: Fetch and display a list of all draft emails associated with the user's email address.
        - Read Specific Email: Retrieve and display the content of a specific email using its ID.
        - List Mails: Fetch and display a list of all emails associated with the user's email address.
        - Send Email with Label: Allow users to send emails with a specified label (e.g., "Interested", "Not Interested", "More Information").`;
      subject = `User is : ${data.label}`;
    }

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
    const choice = response.choices[0];
    console.log("Choice:", choice);

    if (!choice || !choice.message || !choice.message.content) {
      throw new Error("No valid response content from OpenAI");
    }

    const content = choice.message.content;
    const [heading, features, benefits] =
      response.choices[0].message.content.split("\n\n");
    const headingHTML = `<h2>${heading}</h2>`;
    const featuresHTML = `<ul>${features
      .split("\n")
      .map((feature) => `<li>${feature}</li>`)
      .join("")}</ul>`;
    const benefitsHTML = `<ul>${benefits
      .split("\n")
      .map((feature) => `<li>${feature}</li>`)
      .join("")}</ul>`;

    const mailOptions = {
      message: {
        subject: subject,
        body: {
          contentType: "HTML",
          content: `
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; ">
                ${headingHTML}
                ${featuresHTML}
                ${benefitsHTML}
              </div>`,
        },
        toRecipients: [
          {
            emailAddress: {
              address: data.to,
            },
          },
        ],
      },
      saveToSentItems: false,
    };

    const url = "https://graph.microsoft.com/v1.0/me/sendMail";
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const sendMailResponse = await axios.post(url, mailOptions, { headers });
    return sendMailResponse.data;
  } catch (error) {
    throw new Error("Can't send email: " + error.message);
  }
};

const parseAndSendoutlookMail = async (data1, token) => {

  try {
    const {from, to} = data1
    if (!token) {
      throw new Error("Token not found, please login again to get token");
    }
    
    const response = await axios.get(`https://graph.microsoft.com/v1.0/me/messages/${data1.id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const message = response.data;
        console.log(`message::${message}`)
        const subject = message.subject;
        const body = message.body.content;

        let textContent = body; 
        let snippet = message.bodyPreview;
        
        const emailContext = `${subject} ${snippet} ${textContent}`;
        
    const airesponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0301",
      max_tokens: 60,
      temperature: 0.5,
      messages: [
        {
          role: "user",
          content: `based on the following text  just give one word answer, Categorizing the text based on the content and assign a label from the given options -
              Interested,
              Not Interested,
              More information. text is : ${emailContext}`,
        },
      ],
    });

    const prediction = airesponse.choices[0]?.message.content;
    console.log(
      "airesponse.choices[0].message.content",
      airesponse.choices[0].message.content
    );
    console.log("prediction", prediction);
    let label;
    switch (prediction) {
      case "Interested":
        label = "Interested";
        break;
      case "Not Interested":
        label = "Not Interested";
        break;
      case "More information.":
        label = "More information";
        break;
      default:
        label = "Not Sure";
    }

    const data = {
      subject,
      textContent,
      snippet: message.snippet,
      label,
      from,
      to,
    };
    const dataFromMail  = await sendoutlookEmail(data, token);
    return dataFromMail;
  } catch (error) {
    console.log("Can't fetch email ", error.message);
    throw new Error("Can't parse and send email: " + error.message);
  }
};

module.exports = {
  sendOutlookMailViaQueue,
  sendoutlookEmail,
  parseAndSendoutlookMail,
};
