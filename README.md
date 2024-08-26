# ReachInBox Assignment

## Server
The assignment is to build a tool that will parse and check the emails in a Google and Outlook email ID, and
respond to the e-mails based on the context using AI. Use BullMQ as the tasks scheduler
This is a server-based application built with Node.js and Express. It uses various packages such as  `openai` for AI functionalities, `googleapis` for Google APIs, and `axios` for HTTP requests and `bullMQ` to process queues.
![image](https://github.com/shraddha-gawde/reachInbox-assignment/assets/101090200/0237adc4-c817-4d79-9b09-fc0b27f34e6e)


## deployed links :
frontend : [Link](https://reach-inbox-assignment.vercel.app/)
<br>
Backend : [Link](https://reachinbox-assignment-4rf9.onrender.com)
<br>
API documentation build with postman documentation - [Link](https://documenter.getpostman.com/view/31971527/2sA35D43FE)
<br>
Video link for demo of this Application - [Link](https://www.loom.com/share/51a86498fb774c6ba1602c0a2625cebe?sid=bf5e9f0d-23f8-4d54-a89b-b0d3d3412c35)



# technologies used:
- Node.js
- Express.js
- OpenAI
- Google APIs
- Microsoft Graph API
# npm packages used
- dotenv
- Axios
- bullMQ
- google-auth-library
- ioredis
- @microsoft/microsoft-graph-client
- @azure/msal-node

<br>

## Installation setup
1. Clone the repository to your local machine
```bash
git clone https://github.com/shraddha-gawde/reachInbox-assignment.git
```
2. Navigate to the root directory of the project directory :
```bash 
cd server
```
3. Run `npm install` to install all the dependencies
4. Create a `.env` file in the root directory with the same IDs as specified in the documentation.

## Running the server
1. To start the server, run the following command in your terminal
```bash
npm start
```
*This will start the server at localhost:5000 (or whatever port you have specified).*
or we can use backend deployed link also.

2. To start the worker.js file, run the following command in your terminal
```bash
npm run server
```

## API Endpoints

### For Google's OAuth2.0:
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
![image](https://github.com/shraddha-gawde/reachInbox-assignment/assets/101090200/e0bbbdce-1ec4-46c4-8335-e049f7f5b5c7)

### For microsoft azur's OAuth2.0:

- `https://reachinbox-assignment-4rf9.onrender.com/outlook/signin` - GET for micosoft azur authentication for outlook
- `https://reachinbox-assignment-4rf9.onrender.com/outlook/callbak` - GET for micosoft azur getting access token
- `https://reachinbox-assignment-4rf9.onrender.com/outlook/profile` - GET request to get profile data for particular user
- `https://reachinbox-assignment-4rf9.onrender.com/outlook/all-Mails/{email}` - GET request for get ist of all mails of outllok user
- `https://reachinbox-assignment-4rf9.onrender.com/outlook/{email}/read-Msg/{:message}` = GET request to read partivcular mail using messange id
- `https://reachinbox-assignment-4rf9.onrender.com/outlook/{email}/send-Mail` - post request for sending mail to another user using outlook
```
{
    "from":"sendersmail@gmail.com",
    "to":"recieversmail@gmail.com"
     "label":"interested/not-interested/more-information"
}
```
- `https://reachinbox-assignment-4rf9.onrender.com/outlook/sendone/:email/:id` - post request for sending mail to another user using outlook using `bullmq`
```
{
    "from":"sendersmail@gmail.com",
    "to":"recieversmail@gmail.com"
}
```

## Sample .env sample:
```
PORT = ***
GOOGLE_CLIENT_ID = ***
GOOGLE_CLIENT_SECRET = ***
GOOGLE_REDIRECT_URI = ***
GOOGLE_REFRESH_TOKEN = ***
OPENAI_SECRECT_KEY = ***
redis_port = ***
redis_host = ***
redis_pass = ***
AZURE_CLIENT_ID = ***
AZURE_CLIENT_SECRET = *** 
AZURE_TENANT_ID = ***
```
