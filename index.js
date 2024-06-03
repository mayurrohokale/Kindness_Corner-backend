const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./schema/userSchema");
const cors = require("cors");
const PORT = 8000;
const MONGO_URL =
  process.env.mongourl ||
  "mongodb+srv://mayurrohokale12345:EVKCkMOlYPhczrgy@cluster2.nsvpfy1.mongodb.net/";

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
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already taken" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, name, password: hashedPassword });
    const user_data = { name, email, _id: user._id.toString() };

    res.status(200).json({ message: "User created successfully", user: user_data });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get all users
app.get("/users", (req, res) => {
  User.find()
    .then((users) => {
      res.json(users);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: "Internal Server Error" });
    });
});

// User Login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    User.findOne({ email })
        .then(user => {
            if (!user) {
                return res.status(400).json({ message: "Invalid Credentials" });
            }

            bcrypt.compare(password, user.password)
                .then(isMatch => {
                    if (!isMatch) {
                        return res.status(400).json({ message: "Invalid Credentials" });
                    }

                    res.status(200).json({ message: "User logged in successfully" });
                })
                .catch(err => {
                    console.error(err);
                    res.status(500).json({ message: "Server error" });
                });
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ message: "Server error" });
        });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
