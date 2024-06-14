require("dotenv").config({ path: ".env" });
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Razorpay = require('razorpay');
const bcrypt = require("bcrypt");
const crypto = require('crypto'); // Importing crypto module
const User = require("./schema/userSchema");
const Transaction = require("./schema/transactionSchema");
const cors = require("cors");

const PORT = process.env.PORT || 8000;
const MONGO_URL = process.env.mongourl || null;
const JWT_SECRET = process.env.jwtsecret || crypto.randomBytes(64).toString('hex'); // Strong default JWT secret

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

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

// User SignUp
app.post("/signup", async (req, res) => {
  const { name, password, email } = req.body;
  try {
    if (!name || !password || !email) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, name, password: hashedPassword });
    const user_data = { name: name, email: email, _id: String(user._id) };
    const token = jwt.sign(user_data, JWT_SECRET);
    res.status(200).json({ message: "Signup successful", token, user: user_data });
  } catch (err) {
    res.status(400).json({ message: "Email already taken" });
  }
});

// User login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
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
});

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
        address: check_user?.address
      };
      res.status(200).json({ message: "User fetched successfully", user: user });
    }
  } catch (err) {
    res.status(400).json({ message: "Something went wrong" });
  }
});

// for volunteer

app.post("/volunteer", verifyToken, async (req, res) => {
  const { phone, address } = req.body;
  try {
    const user = await User.findOneAndUpdate(
      { email: req.user.email },
      { $set: { phone, address, is_volunteer: true } },
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

// get all volunteers
app.get("/volunteers", async (req, res) => {
  try {
    const volunteers = await User.find(
      { is_volunteer: true },
      { name: 1, email: 1, _id: 1, phone: 1, address: 1 } // Include _id in the result
    );
    if (!volunteers.length) {
      return res.status(404).json({ message: "No volunteers found" });
    }
    res.status(200).json(volunteers);
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// all volunteers count
app.get("/volunteers/count", async (req, res) => {
  try {
    const count = await User.countDocuments({ is_volunteer: true });
    res.status(200).json({ count });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Generate payment link
app.post('/createorder', async (req, res) => {
  const { amount, firstname, lastname, email, phone, address } = req.body; // Added firstname, lastname
  
  const options = {
    amount: amount * 100, // amount in the smallest currency unit
    currency: "INR",
    receipt: "receipt#1",
    payment_capture: 1
  };

  try {
    const order = await razorpay.orders.create(options);
    const transaction = new Transaction({
      firstname,
      lastname,
      email,
      phone,
      address,
      amount,
      order_id: order.id,
      status: 'created'
    });
    await transaction.save();
    res.json({ orderId: order.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Verify payment and update transaction
app.post('/verifypayment', async (req, res) => {
  const { order_id, payment_id, razorpay_signature } = req.body;

  try {
    const transaction = await Transaction.findOne({ order_id });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(order_id + "|" + payment_id)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      transaction.payment_id = payment_id;
      transaction.status = 'paid';
      await transaction.save();
      res.json({ status: 'Payment successful' });
    } else {
      res.status(400).json({ error: 'Invalid signature' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
