

const { connection, redisGetToken } = require("../middlewares/redis.middleware");
require("dotenv").config();
const { Queue } = require("bullmq");
const axios = require("axios");
const { createConfig } = require("../helpers/utils");
const OpenAI = require("openai");


const openai = new OpenAI({ apiKey: process.env.OPENAI_SECRECT_KEY });


const sendMailQueue = new Queue("email-queue", { connection });

async function init(body) {

  const res = await sendMailQueue.add(
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

const sendMailViaQueue = async (req, res) => {
    try {
      const { id, email } = req.params;
      const { from, to } = req.body;
      const token = await redisGetToken(from);
      init({ from, to, id , token});

    } catch (error) {
      console.log("Error in sending mail via queue", error.message);
    }
    res.send("Mail processing has been queued.");
  };
  
  
  const sendMultipleEmails = async (req, res) => {
    try {
      const { id } = req.params;
      const { from, to } = req.body;
  
      if (Array.isArray(to)) {
        for (let i = 0; i < to.length; i++) {
          await sendEmailToQueue({ from, to: to[i], id });
        }
      } else {
        await sendEmailToQueue({ from, to, id });
      }
  
      res.send("Mail processing has been queued.");
    } catch (error) {
      console.log("Error in sending multiple emails", error.message);
      res.status(500).send("Error in sending multiple emails");
    }
  };
  const sendEmailToQueue = async ({ from, to, id }) => {
    try {
      // Enqueue a job to send the email
      await sendMailQueue.add("send-email", { from, to, id });
      console.log(`Email to ${to} has been queued.`);
    } catch (error) {
      console.error("Error enqueuing email job:", error.message);
      throw error;
    }
  };

  const sendMail = async (data, token) => {
    try {
      // const Token = accessToken;
      if (!token) {
        throw new Error("Token not found, please login again to get token");
      }
  
      const mailOptions = {
        from: data.from,
        to: data.to,
        subject: "",
        text: "",
        html: "",
      };
      let emailContent = "";
      if (data.label === "Interested") {
        // Advertisement prompt
        emailContent = `If the email mentions they are interested, do not generate any recipant's name instead use Dear user, your reply should give this advertisement i have express some key points below user then and create good reply for advertivement it shold render on email in bullet points
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px;">
        <p>We're excited to share with you how our product can benefit you:</p>
        <ul>
          <li><strong>Secure Mailing:</strong> Our platform offers end-to-end encryption to ensure your emails remain private and secure.</li>
          <li><strong>Automated Emails:</strong> Easily automate your email workflows by setting timers and triggers. Schedule emails to be sent at specific times or based on user actions.</li>
          <li><strong>Customizable Templates:</strong> Create personalized email templates and automate repetitive tasks, saving you time and effort.</li>
        </ul>
        <p>Would you like to learn more about how our platform can streamline your email communication? Feel free to reply to this email.</p>
      </div>`;
  
        mailOptions.subject = `User is : ${data.label}`;
      } 
      
      else if (data.label === "Not Interested") {
        emailContent = `If the email mentions they are not interested, create a reply where we should ask them for feedback on why they are not interested. do not generate any recipant's name instead use Dear user.
          Write a small text on the above request in around 100-150 words`;
        mailOptions.subject = `User is : ${data.label}`;
      } 
      
      else if (data.label === "More Information") {
        emailContent = `
        If the email mentions they are interested to know more, your reply should give them more information about this product. Here are some of its key features:<br><br>
        use this as heading for my reply. make it in bullet points but give style as none.
        Thank you for expressing interest in our product! We're thrilled to share more details with you:
  
        <p>Our product is a comprehensive email management platform designed to streamline your communication workflows.</p>
        here are some features and benefits we can provide for user
  
        <ul>
        <li><strong>Google Authentication:</strong> Allow users to authenticate using their Google accounts.</li>
        <li><strong>View User Profile:</strong> Retrieve and display user profile information such as name, email, and profile picture.</li>
        <li><strong>View All Drafts:</strong> Fetch and display a list of all draft emails associated with the user's email address.</li>
        <li><strong>Read Specific Email:</strong> Retrieve and display the content of a specific email using its ID.</li>
        <li><strong>List Mails:</strong> Fetch and display a list of all emails associated with the user's email address.</li>
        <li><strong>Send Email with Label:</strong> Allow users to send emails with a specified label (e.g., "Interested", "Not Interested", "More Information").</li>
      </ul>
          <strong>Send Email with Label:</strong> Allow users to send emails with a specified label (e.g., "Interested", "Not Interested", "More Information").`;
  
        mailOptions.subject = `User wants : ${data.label}`;
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
  
  
      const [heading, features, benefits] = response.choices[0].message.content.split('\n\n');
  
      const headingHTML = `<h2>${heading}</h2>`;
  
      const featuresHTML = `<ul style="list-style: none">${features.split('\n').map(feature => `<li style="list-style: none">${feature}</li>`).join('')}</ul>`;
      const benefitsHTML = `<ul style="list-style: none">${benefits.split('\n').map(feature => `<li style="list-style: none">${feature}</li>`).join('')}</ul>`;
  
      mailOptions.text = `${heading}\n\n${features}`;
      mailOptions.html = `
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; ">
          ${headingHTML}
          ${featuresHTML}
          ${benefitsHTML}
        </div>`;
  
        const emailData = [
          'Content-type: text/html;charset=iso-8859-1',
          'MIME-Version: 1.0',
          `from: ${data.from}`,
          `to: ${data.to}`,
          `subject: ${mailOptions.subject}`,
          `text: ${mailOptions.text}`,
          `html: ${mailOptions.html}`,
    ].join('\n');
  
  
    
        const sendMessageResponse = await axios.post(`https://gmail.googleapis.com/gmail/v1/users/${data.from}/messages/send`,{raw:Buffer.from(emailData).toString(`base64`)}, {
          headers: {
            "Content-Type" : "application/json",
            'Authorization': `Bearer ${token}`
          }
        });
        
  
      let labelId;
      switch (data.label) {
        case "Interested":
          labelId = "Label_1";
          break;
        case "Not Interested":
          labelId = "Label_2";
          break;
        case "More Information":
          labelId = "Label_3";
          break;
        default:
          break;
      }
  
      const labelUrl = `https://gmail.googleapis.com/gmail/v1/users/${data.from}/messages/${sendMessageResponse.data.id}/modify`;
      const labelConfig = {
        method: 'POST',
        url: labelUrl,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        data: {
          addLabelIds: [labelId]
        }
      };
      const labelResponse = await axios(labelConfig);
      
      console.log(sendMessageResponse.data.id)
      return sendMessageResponse.data.id.result;
    } catch (error) {
      console.log(error)
      throw new Error("Can't send email: " + error.message);
      
    }
  };

  const parseAndSendMail = async (data1, token) => {
    try {
      const { from, to } = data1;
      if (!token) {
        throw new Error("Token not found, please login again to get token");
      }
      // const token = await redisGetToken(to);
      const url1 = `https://gmail.googleapis.com/gmail/v1/users/${from}/messages/${data1.id}`;
      const config = createConfig(url1, token);
      const message = await axios(config);
  
      const payload = message.data.payload;
      const headers = payload.headers;
      const subject = headers.find((header) => header.name === "Subject")?.value;
  
      let textContent = "";
      if (payload.parts) {
        const textPart = payload.parts.find(
          (part) => part.mimeType === "text/plain"
        );
        if (textPart) {
          textContent = Buffer.from(textPart.body.data, "base64").toString(
            "utf-8"
          );
        }
      } else {
        textContent = Buffer.from(payload.body.data, "base64").toString("utf-8");
      }
      let snippet = message.data.snippet;
      let emailContext = `${subject} ${snippet} ${textContent} `;
      let emailContextUpdated = emailContext.slice(0, 4000);
  
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0301",
        max_tokens: 60,
        temperature: 0.5,
        messages: [
          {
            role: "user",
            content: `based on the following text  just give one word answer, Categorizing the text based on the content and assign a label from the given options - Interested, Not Interested, More information. text is : ${emailContextUpdated}`,
          },
        ],
      });
  
      const prediction = response.choices[0]?.message.content;
      console.log(prediction);
      let label;
      if (prediction.includes("Not Interested")) {
        label = "Not Interested";
      } else if (prediction.includes("info")) {
        label = "More information";
      } else {
        label = "Interested";
      }
  
      const data = {
        subject,
        textContent,
        snippet: message.data.snippet,
        label,
        from,
        to,
      };
      console.log(data);
      const dataFromMail = await sendMail(data, token);
      return dataFromMail;
    } catch (error) {
      console.log("Can't fetch email ", error.message);
      return -1;
    }
  };

  module.exports = {
    sendMailViaQueue,
    sendMultipleEmails,
    parseAndSendMail
  };