require('dotenv').config({path:'.env'});
const express = require("express");
const jwt = require('jsonwebtoken');
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./schema/userSchema");
const cors = require("cors");
const PORT = 'https://kindness-server.vercel.app';
const MONGO_URL =
  process.env.mongourl || null;

const JWT_SECRET = process.env.jwtsecret || "secret";

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
app.post('/signup', async (req, res) => {
  const { name, password, email } = req.body;
  try {
      if (!name || !password || !email) {
          return res.status(400).json({ message: 'All fields are required' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({ email, name, password: hashedPassword })
      const user_data = { name: name, email: email, _id: String(user._id) };
      const token = jwt.sign(
        user_data,
        JWT_SECRET
      );
      res.status(200).json({ message: 'Signup successful', token, user :user_data});
  } catch (err) {
      res.status(400).json({ message: 'Email already taken' });
  }
});

// User login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
  }
  const token = jwt.sign(
    { name: user.name, email: user.email, _id: String(user._id) },
    JWT_SECRET
  );
  res.status(200).json({ message: 'Login successful', token, user : {name: user.name, email: user.email}});
});



// Middleware for verifying JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
          return res.status(401).json({ message: 'Unauthorized' });
      }
      req.user = decoded;
      next();
  });
};


app.get('/me', verifyToken, async (req, res) => {
  
  try {
    const check_user = await User.findOne({ email: req.user.email });
    if (!check_user) {
        return res.status(401).json({ message: 'Unauthorized' });
    
    
  } else {
    res.status(200).json({ message: 'User fetched successfully', user: {name: check_user.name, email: check_user.email}});
  }
} catch (err) {
  res.status(400).json({ message: 'Something went wrong' });
}
});



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
