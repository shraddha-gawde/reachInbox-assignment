# reachInbox-assignment

## Server
The assignment is to build a tool that will parse and check the emails in a Google and Outlook email ID, and
respond to the e-mails based on the context using AI. Use BullMQ as the tasks scheduler
This is a server-based application built with Node.js and Express. It uses various packages such as `nodemailer` for sending emails, `openai` for AI functionalities, `googleapis` for Google APIs, and `axios` for HTTP requests and `bullMQ` to process queues.

## deployed links :
frontend : [Link](https://reach-inbox-assignment-kftow0xle.vercel.app/)
<br>
Backend : [Link](https://reachinbox-assignment-4rf9.onrender.com)
<br>
API documentation build with postman documentation - [Link](https://documenter.getpostman.com/view/31971527/2sA35D43FE)

# Built with
- Node.js
- Express.js
- Nodemailer
- OpenAI
- Google APIs
- Axios
- bullMQ


<br>

## API Endpoints

For Google's OAuth2.0:
- `https://reachinbox-assignment-4rf9.onrender.com/auth/google` - GET for google authentication
- `https://reachinbox-assignment-4rf9.onrender.com/api/mail/userInfo/:email` - GET request to view user profile
- `https://reachinbox-assignment-4rf9.onrender.com/api/mail/allDrafts/:email` - GET request to view all drafts mail.
- `https://reachinbox-assignment-4rf9.onrender.com/api/mail/read/:email/message/:message` - GET request to read a specific email(using id).
- `https://reachinbox-assignment-4rf9.onrender.com/api/mail/list/:email` - GET request to get a list of mails.
- `https://reachinbox-assignment-4rf9.onrender.com/api/mail/sendMail` - POST request send mail with label.
```
{
    "from":"sendersmail@gmail.com",
    "to":"recieversmail@gmail.com",
    "label":"interested/not-interested/more-information"
}
```
- `https://reachinbox-assignment-4rf9.onrender.com/api/mail/sendone/:id` - POST request to send a single mail for particular ID.
```
{
    "from":"sendersmail@gmail.com",
    "to":"recieversmail@gmail.com"
}
```
- - `https://reachinbox-assignment-4rf9.onrender.com/api/mail/sendMultiple/:id` - POST request to send a single mail for particular ID.
 ```
{
    "from":"sendersmail@gmail.com",
    "to":["demo@gmail.com","demo@gmail.com", "demo@gmail.com"]
}
```
For microsoft azur's OAuth2.0:

- `https://reachinbox-assignment-4rf9.onrender.com/signin` - GET for micosoft azur authentication for outlook
- `https://reachinbox-assignment-4rf9.onrender.com/get-access-token` - GET for micosoft azur getting access token

