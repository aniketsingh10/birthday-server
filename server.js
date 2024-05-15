// Load environment variables from a .env file
require("dotenv").config();

// Required modules
const crypto = require("crypto");
const cron = require("node-cron");
const fs = require("fs");
const nodemailer = require("nodemailer");
const path = require("path");
const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Server is running");
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

// Function to execute the task
const task = () => {
  const currentDate = new Date();

  // Options for formatting time in Indian Standard Time
  const options = {
    hour12: true,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZone: "Asia/Kolkata",
  };

  const indianTime = currentDate.toLocaleTimeString("en-IN", options);
  const [time, period] = indianTime.split(" ");
  const [hour, minute, second] = time.split(":");

  const hour24 =
    period === "PM" && hour !== "12"
      ? (parseInt(hour) + 12).toString().padStart(2, "0")
      : period === "AM" && hour === "12"
      ? "00"
      : hour.padStart(2, "0");
  const formattedTime24 = `${hour24}:${minute.padStart(
    2,
    "0"
  )}:${second.padStart(2, "0")}`;

  // console.log(`Hour: ${hour}`);
  // console.log(`Minute: ${minute}`);
  // console.log(`Second: ${second}`);
  // console.log(`Period: ${period}`);
  // console.log(`Formatted Time (24-hour): ${formattedTime24}`);

  if (
    formattedTime24 >= "12:00:00" &&
    formattedTime24 <= "12:11:00" &&
    period == "am"
  ) {
    readAndExecute();
  }
};

// Schedule the task to run after every 10 minute
const cronSchedule = "*/10 * * * *";
cron.schedule(cronSchedule, task);

// Function to read data from a file and execute a sendEmails
function readAndExecute() {
  const filePath = "dates.txt";
  let data;

  const encryptionKey = process.env.ENCRYPTION_KEY;

  // Check if encryption key is available
  if (!encryptionKey) {
    throw new Error("Encryption key not found in environment variables.");
  }

  const algorithm = "aes-256-ctr";

  fs.readFile(filePath, "utf8", (err, fileData) => {
    if (err) {
      console.error("Error reading file:", err);
      return;
    }

    // Decrypt the data inside the callback function
    const decipher = crypto.createDecipher(algorithm, encryptionKey);
    let decryptedData = decipher.update(fileData, "hex", "utf8");
    decryptedData += decipher.final("utf8");

    // Assign the decrypted data to the global variable
    data = JSON.parse(decryptedData);

    sendBirthdayEmails(data);
  });
}

// Nodemailer transporter for sending emails
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.USER,
    pass: process.env.PASS,
  },
});

// Function to send an email using Nodemailer
const sendMail = async (transporter, mailOptions) => {
  try {
    await transporter.sendMail(mailOptions);
    console.log("Mail sent successfully");
  } catch (error) {
    console.error("Error occurred while sending mail:", error);
  }
};

// Function to send birthday emails to users
const sendBirthdayEmails = async (data) => {
  const currentDate = new Date();

  const day = currentDate.getDate();
  const monthIndex = currentDate.getMonth() + 1;
  const month = monthIndex < 10 ? "0" + monthIndex : monthIndex;
  const date = month + "/" + day;

  for (const user in data.userProfile) {
    const userData = data.userProfile[user];
    const birthDate = userData.dob;

    // Check if the user's birthday matches the current date
    if (birthDate == date) {
      const username = userData.name;
      const userEmail = userData.email;

      const mailOptions = {
        from: {
          name: "Aniket Singh",
          address: process.env.USER,
        },
        to: userEmail,
        subject: `🎉 Happy Birthday ${username}! 🎉`,
        html: `<div>
        <p>Wishing you a very Happy Birthday ${username}! 🎂🎈🎉</p>
        <p>May your special day be filled with joy, laughter, and all the things that bring you happiness.</p>
        <p>Cheers to another wonderful year ahead!</p>
        <p>Best regards,<br/>Aniket Singh</p>
        <img src="cid:unique@nodemailer.com"/>
        <p>If you want to reply back, please email me at <a href="mailto:aniketsinghofficial144@gmail.com">aniketsinghofficial144@gmail.com</a> 😉</p>
      </div>`,
        attachments: [
          {
            filename: "birthday.jpg",
            path: path.join(__dirname, "birthday.jpg"),
            cid: "unique@nodemailer.com",
          },
        ],
      };

      // Send the birthday email
      await sendMail(transporter, mailOptions);
    }
  }
};
