const express = require("express");
const session = require("express-session");
const cors = require("cors");

const bodyParser = require("body-parser");

const app = express();
require("dotenv").config();

const router = require("./routes/message.Routes");
const { googleRouter } = require("./routes/googleauth.routes");
const { outlookRouter } = require("./controllers/outlookController");

app.use(bodyParser.json());
app.use(cors());

app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "any_secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

// MessageRoutes
app.use("/", googleRouter);
app.use("/api/mail", router);
app.use("/", outlookRouter);

app.get("/get", async (req, res) => {
  return res.json({ message: "Hello World" });
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port http://localhost:${process.env.PORT}`);
});
