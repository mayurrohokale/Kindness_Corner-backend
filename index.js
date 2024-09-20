require("dotenv").config({ path: ".env" });
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Vote = require("./schema/voteSchema");
const Razorpay = require("razorpay");
const bcrypt = require("bcrypt");
const crypto = require("crypto"); // Importing crypto module
const User = require("./schema/userSchema");
const Donation = require("./schema/donationSchema");
const Query = require("./schema/Qurey");
const Transaction = require("./schema/transactionSchema");
const Works = require("./schema/compltetedWorks");
const cors = require("cors");
const Blog = require("./schema/blogSchema");
const axios = require("axios");
const nodemailer = require("nodemailer");
const OTP_schema = require("./schema/OTP_Schema");


const PORT = process.env.PORT || 8000;
const MONGO_URL = process.env.mongourl || null;
const JWT_SECRET =
  process.env.jwtsecret || crypto.randomBytes(64).toString("hex"); // Strong default JWT secret

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const transporter = nodemailer.createTransport({
  service: "gmail",
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const frontendUrl = process.env.FRONT_URL || `http://localhost:3000`;

const app = express();

app.use(cors());
app.use(express.json()); // Middleware to parse JSON request bodies

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((err) => {
    console.error("MongoDB Connection Error: ", err);
  });

// Root index
app.get("/", (req, res) => {
  res.status(200).json({ message: "welcome to Kindness Corner API!" });
});
//User SignUp
// app.post("/signup", async (req, res) => {
//   const { name, password, email } = req.body;
//   try {
//     if (!name || !password || !email) {
//       return res.status(400).json({ message: "All fields are required" });
//     }
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const user = await User.create({ email, name, password: hashedPassword });
//     const user_data = { name: name, email: email, _id: String(user._id) };
//     const token = jwt.sign(user_data, JWT_SECRET);
//     res
//       .status(200)
//       .json({ message: "Signup successful", token, user: user_data });
//   } catch (err) {
//     res.status(400).json({ message: "Email already taken" });
//   }
// });

app.post("/signup", async (req, res) => {
  const { name, password, email } = req.body;
  try {
    if (!name || !password || !email) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, name, password: hashedPassword });
    const user_data = { name: name, email: email, _id: String(user._id) }; 

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    // const otpExpires = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

    const OTP_DOC = new OTP_schema({
      email,
      otp,
    });
    await OTP_DOC.save();

    // Send the OTP to the user's email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP for Registration",
      // html: `<h1>Your OTP is <strong style="font-size: 35px;">${otp}</strong>. It is valid for 10 minutes.</h1>`,
      html: `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
  <div style="margin:50px auto;width:70%;padding:20px 0">
    <div style="border-bottom:1px solid #eee">
      <a href="https://kindness-corner.vercel.app/" style="font-size:1.4em;color: #2196F3;text-decoration:none;font-weight:600">Kindness Corner</a>
    </div>
    <p style="font-size:1.1em">Hi,</p>
    <p>Plese Use the Following One Time Password (OTP) for Sign In into your Account. OTP is valid for 10 minutes</p>
    <h1 style="font-size: 20px; font: bold; text:center">Verification Code</h1>
    <h2 style="font-size: 30px; margin: 0 auto;width: max-content;padding: 0 10px;color: black;border-radius: 4px;letter-spacing: 8px;">${otp}</h2>
    <p style="font-size:0.9em;">Regards,<br />Kindness Corner</p>
    <hr style="border:none;border-top:1px solid #eee" />
    <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
      <p>Kindnesshelp Inc</p>
      <p>Pune, India</p>
    </div>
  </div>
</div>`,
    };
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "OTP sent to your email, Verify Email" });
   
  } catch (err) {
    res.status(400).json({ message: "Email already taken" });
  }
});



//User login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      console.log("User not found");
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Password does not match");
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.status === "false") {
      console.log("User is disabled");
      return res
        .status(403)
        .json({ message: "Your ID is disabled. Please contact to support." });
    }

    const token = jwt.sign(
      { name: user.name, email: user.email, _id: String(user._id) },
      JWT_SECRET
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: { name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});



// app.post("/login", async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     const user = await User.findOne({ email });

//     if (!user) {
//       console.log("User not found");
//       return res.status(401).json({ message: "Invalid email or password" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       console.log("Password does not match");
//       return res.status(401).json({ message: "Invalid email or password" });
//     }

//     if (user.status === "false") {
//       console.log("User is disabled");
//       return res
//         .status(403)
//         .json({ message: "Your ID is disabled. Please contact support." });
//     }

//     // Generate a 4-digit OTP
//     const otp = Math.floor(1000 + Math.random() * 9000).toString();
//     // const otpExpires = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

//     const OTP_DOC = new OTP_schema({
//       email,
//       otp,
//     });
//     await OTP_DOC.save();

//     // Send the OTP to the user's email
//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: "Your OTP for login",
//       // html: `<h1>Your OTP is <strong style="font-size: 35px;">${otp}</strong>. It is valid for 10 minutes.</h1>`,
//       html: `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
//   <div style="margin:50px auto;width:70%;padding:20px 0">
//     <div style="border-bottom:1px solid #eee">
//       <a href="https://kindness-corner.vercel.app/" style="font-size:1.4em;color: #2196F3;text-decoration:none;font-weight:600">Kindness Corner</a>
//     </div>
//     <p style="font-size:1.1em">Hi,</p>
//     <p>Plese Use the Following One Time Password (OTP) for Login into your Account. OTP is valid for 10 minutes</p>
//     <h1 style="font-size: 20px; font: bold; text:center">Verification Code</h1>
//     <h2 style="font-size: 30px; margin: 0 auto;width: max-content;padding: 0 10px;color: black;border-radius: 4px;letter-spacing: 8px;">${otp}</h2>
//     <p style="font-size:0.9em;">Regards,<br />Kindness Corner</p>
//     <hr style="border:none;border-top:1px solid #eee" />
//     <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
//       <p>Kindnesshelp Inc</p>
//       <p>Pune, India</p>
//     </div>
//   </div>
// </div>`,
//     };
//     await transporter.sendMail(mailOptions);

//     res.status(200).json({ message: "OTP sent to your email" });
//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({ message: "Something went wrong" });
//   }
// });


// Middleware for verifying JWT



const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = decoded;
    next();
  });
};

app.get("/user-status/:userId", [verifyToken], async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).select("status");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ status: user.status });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

//send - OTP
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    // const otpExpires = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

    const OTP_DOC = new OTP_schema({
      email,
      otp,
    });
    await OTP_DOC.save();

    // Send the OTP to the user's email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP for login",
      // html: `<h1>Your OTP is <strong style="font-size: 35px;">${otp}</strong>. It is valid for 10 minutes.</h1>`,
      html: `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
  <div style="margin:50px auto;width:70%;padding:20px 0">
    <div style="border-bottom:1px solid #eee">
      <a href="https://kindness-corner.vercel.app/" style="font-size:1.4em;color: #2196F3;text-decoration:none;font-weight:600">Kindness Corner</a>
    </div>
    <p style="font-size:1.1em">Hi,</p>
    <p>Plese Use the Following One Time Password (OTP) for Login into your Account. OTP is valid for 10 minutes</p>
    <h1 style="font-size: 20px; font: bold; text:center">Verification Code</h1>
    <h2 style="font-size: 30px; margin: 0 auto;width: max-content;padding: 0 10px;color: black;border-radius: 4px;letter-spacing: 8px;">${otp}</h2>
    <p style="font-size:0.9em;">Regards,<br />Kindness Corner</p>
    <hr style="border:none;border-top:1px solid #eee" />
    <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
      <p>Kindnesshelp Inc</p>
      <p>Pune, India</p>
    </div>
  </div>
</div>`,
    };
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("Error in sending OTP:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

////////------/// verify-Otp   ////------- ////////
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    const OTP_DOC = await OTP_schema.findOne({ email });

    if (!OTP_DOC) {
      return res.status(404).json({ message: "OTP not found" });
    }
    if (OTP_DOC.otp !== parseInt(otp)) {
      return res.status(401).json({ message: "Invalid OTP" });
    }
    
    user.isEmail_verified = true;
    await user.save();
    const user_data = { email: email, _id: String(user._id) }; 

    const token = jwt.sign(user_data, JWT_SECRET);
       res.status(200).json({ message: "Signup successful", token, user: user_data });
 
    await OTP_schema.deleteOne({email});

  
  } catch (err) {
    console.error("Error in verifying OTP:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Forgot Password
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const secret = JWT_SECRET + user.password;
    const token = jwt.sign({ userId: user._id, email: user.email }, secret, {
      expiresIn: "15m",
    });

    const resetLink = `${frontendUrl}/reset-password/${token}`;

    const receiver = {
      from: "kindnesshelp@gmail.com",
      to: user.email,
      subject: "Reset Password Request",
      text: `Click on this link to generate your new password: ${resetLink}`,
    };

    await transporter.sendMail(receiver);
    res.status(200).json({ message: "Password reset link sent to your email" });
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

////////////---- Reset Password -----///////////////

app.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // Decode the token payload
    const decoded = jwt.decode(token);
    if (!decoded) {
      return res.status(400).json({ error: "Invalid token" });
    }

    const { userId, email } = decoded;

    // Fetch the user from the database
    const user = await User.findOne({ _id: userId, email });

    if (!user) {
      return res.status(404).json({
        error: "UserNotFound",
        message: "Invalid token or user not found",
      });
    }

    // Verify the token with the secret (JWT_SECRET + user's password)
    const secret = JWT_SECRET + user.password;
    try {
      jwt.verify(token, secret);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res
          .status(400)
          .json({ error: "TokenExpired", message: "Reset link has expired" });
      }
      return res
        .status(400)
        .json({ error: "InvalidToken", message: "Invalid reset token" });
    }

    // Hash the new password before saving it
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update the user's password in the database
    user.password = hashedPassword;
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Error in reset password:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

/////////////  isAdmin /////
const isAdmin = async (req, res, next) => {
  user = await User.findOne({ email: req?.user?.email });

  if (user?.role !== "admin") {
    return res.status(401).json({ message: "Not Access" });
  }
  next();
};

app.post("/testadmin", [verifyToken, isAdmin], async (req, res) => {
  try {
    return res.status(200).json({ message: "success" });
  } catch {
    return res.status(401).json({ message: "Not Access" });
  }
});

app.post("/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (user?.role !== "admin") {
      return res.status(401).json({ message: "UnAuthorized Access" });
    }
    const token = jwt.sign(
      { name: user.name, email: user.email, _id: String(user._id) },
      JWT_SECRET
    );
    res.status(200).json({
      message: "Login successful",
      token,
      user: { name: user.name, email: user.email },
    });
  } catch {
    return res.status(401).json({ message: "Invalid Credentials" });
  }
});

app.get("/me", verifyToken, async (req, res) => {
  try {
    const check_user = await User.findOne({ email: req.user.email });
    if (!check_user) {
      return res.status(401).json({ message: "Unauthorized" });
    } else {
      const user = {
        name: check_user.name,
        email: check_user.email,
        is_volunteer: check_user?.is_volunteer,
        phone: check_user?.phone,
        address: check_user?.address,
        city: check_user?.city,
        state: check_user?.state,
        pincode: check_user?.pincode,
        status: check_user?.status,
        isEmail_verified: check_user?.isEmail_verified,
      };
      res
        .status(200)
        .json({ message: "User fetched successfully", user: user });
    }
  } catch (err) {
    res.status(400).json({ message: "Something went wrong" });
  }
});

// for volunteer

app.post("/volunteer", verifyToken, async (req, res) => {
  const { phone, address, state, city, pincode } = req.body;
  try {
    const user = await User.findOneAndUpdate(
      { email: req.user.email },
      { $set: { phone, address, state, city, pincode, is_volunteer: true } },
      { new: true }
    );
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User set to volunteer successfully" });
  } catch (err) {
    res.status(400).json({ message: "Something went wrong" });
  }
});

//get all volunteers
app.get("/volunteers", async (req, res) => {
  try {
    const volunteers = await User.find(
      { is_volunteer: true },
      { name: 1, email: 1, _id: 1, phone: 1, city: 1, pincode: 1, state: 1 } // Include the necessary fields
    );

    if (!volunteers.length) {
      return res.status(404).json({ message: "No volunteers found" });
    }

    const modifiedVolunteers = volunteers.map((volunteer) => {
      const emailParts = volunteer.email.split("@");
      const firstPart = emailParts[0];
      const firstThree = firstPart.slice(0, 3);
      const obscuredEmail =
        firstThree + "*".repeat(firstPart.length - 3) + "@" + emailParts[1];

      const obscuredPhone = volunteer.phone
        ? volunteer.phone.replace(/.(?=.{4})/g, "*")
        : "";

      return {
        ...volunteer._doc, // Spread the existing volunteer fields
        email: obscuredEmail,
        phone: obscuredPhone,
        city: volunteer.city,
        address: volunteer.address,
        pincode: volunteer.pincode,
      };
    });

    res.status(200).json(modifiedVolunteers);
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

//get Volunteer data by ID

// all volunteers count
app.get("/volunteers/count", async (req, res) => {
  try {
    const count = await User.countDocuments({ is_volunteer: true });
    res.status(200).json({ count });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

///////////////////////// For Payments ///////////////////////

//get transactions

// app.get('/transactions', async (req, res) => {
//   try {
//     const response = await axios.get('https://api.razorpay.com/v1/payments', {
//       auth: {
//         username: process.env.RAZORPAY_KEY_ID,
//         password: process.env.RAZORPAY_KEY_SECRET
//       }
//     });
//     res.json(response.data);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

///////////////////////////////////  for Voting  ///////////////////////////////

app.post("/vote", verifyToken, async (req, res) => {
  const { voteFormId, vote } = req.body;

  if (!["yes", "no"].includes(vote)) {
    return res.status(400).json({ message: "Invalid vote option" });
  }

  try {
    const existingVote = await Vote.findOne({
      userId: req.user._id,
      voteFormId,
    });

    if (existingVote) {
      return res.status(400).json({ message: "User has already voted" });
    }

    const newVote = new Vote({
      userId: req.user._id,
      voteFormId,
      vote,
    });

    await newVote.save();
    res.status(200).json({ message: "Vote cast successfully" });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Endpoint to check if user has already voted
app.get("/hasvoted/:voteFormId", verifyToken, async (req, res) => {
  const { voteFormId } = req.params;

  try {
    const existingVote = await Vote.findOne({
      userId: req.user._id,
      voteFormId,
    });

    if (existingVote) {
      return res.status(200).json({ hasVoted: true, vote: existingVote.vote });
    } else {
      return res.status(200).json({ hasVoted: false });
    }
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Endpoint to get the total votes for a specific form ID
app.get("/countvotes/:voteFormId", async (req, res) => {
  const { voteFormId } = req.params;

  try {
    const yesVotesCount = await Vote.countDocuments({
      voteFormId,
      vote: "yes",
    });
    const noVotesCount = await Vote.countDocuments({ voteFormId, vote: "no" });

    res.status(200).json({
      yes: yesVotesCount,
      no: noVotesCount,
      total: yesVotesCount + noVotesCount,
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////// ADMIN PANEL ////////////////////////////////////////////////////////

// All volunteers Details without any encryption
app.get("/volunteers-admin", async (req, res) => {
  try {
    const volunteers = await User.find();

    res.status(200).json(volunteers);
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// USERS COUNT

app.get("/users-count", async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users.length);
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});
app.put(
  "/update-user-status/:userId",
  [verifyToken, isAdmin],
  async (req, res) => {
    const { userId } = req.params;
    const { status } = req.body;

    if (status !== "true" && status !== "false") {
      return res.status(400).json({ message: "Invalid status value" });
    }

    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { status },
        { new: true }
      );
      res.status(200).json(user);
    } catch (err) {
      res.status(500).json({ message: "Something went wrong" });
    }
  }
);

//get all users

app.get("/users", [verifyToken, isAdmin], async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// DELETE USSER
app.delete("/delete-user/:id", [verifyToken, isAdmin], async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});
// active user count
app.get("/active-users-count", async (req, res) => {
  try {
    const activeUsers = await User.countDocuments({ status: true });
    res.status(200).json({ activeUsers });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// disable users count
app.get("/disable-users-count", async (req, res) => {
  try {
    const disableUsers = await User.countDocuments({ status: false });
    res.status(200).send({ disableUsers });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

////////////////////////////////////////////////////////////////////////////////

////////////////     ADD DONATION FORM    ///////////////
app.post("/donation-form", [verifyToken, isAdmin], async (req, res) => {
  const {
    title,
    description,
    amount,
    contact,
    eventFromDate,
    eventToDate,
    date,
    image,
  } = req.body;

  if (
    !title ||
    !description ||
    !amount ||
    !contact ||
    !eventFromDate ||
    !image ||
    !eventToDate
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const donation = new Donation({
      title,
      description,
      amount,
      contact,
      eventFromDate,
      eventToDate,
      date,
      image,
    });

    await donation.save();
    res
      .status(201)
      .json({ message: "Donation Form Data successfully created", donation });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err });
  }
});

//get Donation Form Details
app.get("/get-donation-form", async (req, res) => {
  try {
    const donation = await Donation.find();
    res
      .status(200)
      .json({ message: "Donation Form Data successfully fetched", donation });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err });
  }
});

// Route to get a donation form by ID
app.get("/donation-form/:id", async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ message: "Donation form not found" });
    }
    res.json(donation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete Donation Form
app.delete(
  "/delete-donation-form/:id",
  [verifyToken, isAdmin],
  async (req, res) => {
    try {
      const donation = await Donation.findByIdAndDelete(req.params.id);
      if (!donation) {
        return res.status(404).json({ message: "Donation form not found" });
      }
      res.json({ message: "Donation form deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: "Something went wrong", error: err });
    }
  }
);

//////// ////////////////     BLOGS FORM      ///////////////

app.post("/add-blog", [verifyToken], async (req, res) => {
  const { title, description, image, author, date } = req.body;
  try {
    const blog = new Blog({
      title,
      description,
      image,
      author,
      date,
      status: "pending",
    });
    await blog.save();
    res
      .status(201)
      .json({ message: "Blog Form Data successfully created", blog });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err });
  }
});

app.post("/approve-blog/:id", [verifyToken, isAdmin], async (req, res) => {
  const { id } = req.params;
  try {
    const blog = await Blog.findByIdAndUpdate(
      id,
      { status: "approved" },
      { new: true }
    );
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.status(200).json({ message: "Blog approved", blog });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err });
  }
});

// app.get("/get-blog/:id", [verifyToken], async (req, res) => {
//   try {
//     const blog = await Blog.findById(req.params.id);
//     if (!blog) {
//       return res.status(404).json({ message: "Blog not found" });
//     }
//     res.json(blog);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

app.get("/approved-blogs", async (req, res) => {
  try {
    const blogs = await Blog.find({ status: "approved" });
    res.status(200).json(blogs);
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err });
  }
});

app.get("/approved-blogs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findOne({ _id: id, status: "approved" });
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.status(200).json(blog);
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err });
  }
});

app.get("/get-blog", [verifyToken, isAdmin], async (req, res) => {
  try {
    const blogs = await Blog.find();
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//delete blog
app.delete("/delete-blog/:id", [verifyToken, isAdmin], async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.status(200).json({ message: "Blog deleted", blog });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err });
  }
});

///////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

///////////////////// Query API /////////////////////////

// post Query
app.post("/post-query", async (req, res) => {
  const { email, description } = req.body;
  const query = new Query({ email, description });
  try {
    await query.save();
    res.status(201).json({ message: "Query saved successfully" });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err });
  }
});

// get Query
app.get("/get-queries", [isAdmin], async (req, res) => {
  try {
    const queries = await Query.find();
    res.json(queries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//  get query by ID
app.get("/get-query/:id", [isAdmin], async (req, res) => {
  try {
    const query = await Query.findById(req.params.id);
    if (!query) {
      return res.status(404).json({ message: "Query not found" });
    }
    res.json(query);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// delete query by ID
app.delete("/delete-query/:id", [isAdmin], async (req, res) => {
  try {
    await Query.findByIdAndRemove(req.params.id);
    res.json({ message: "Query deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



////////////////////// ----- COMPLETED WORKS ----------////////////////////

app.post("/add-completed-works", [isAdmin], async(req, res) => {
  const { title, description, image} = req.body;
  if(!title || !description || !image){
    return res.status(400).json({ message: "Please fill in all fields" });
  }
  const Completedworks = new Works({title, description, image});
  try{
    await Completedworks.save();
    res.status(201).json({ message: "Completed works Data saved successfully" });
  }catch(err){
    res.status(500),json({message: err.message})
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
