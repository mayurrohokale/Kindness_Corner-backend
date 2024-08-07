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
const cors = require("cors");
const Blog = require("./schema/blogSchema");
const axios = require("axios");

const PORT = process.env.PORT || 8000;
const MONGO_URL = process.env.mongourl || null;
const JWT_SECRET =
  process.env.jwtsecret || crypto.randomBytes(64).toString("hex"); // Strong default JWT secret

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
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

// Root index
app.get("/", (req, res) => {
  res.status(200).json({ message: "welcome to Kindness Corner API!" });
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
    res
      .status(200)
      .json({ message: "Signup successful", token, user: user_data });
  } catch (err) {
    res.status(400).json({ message: "Email already taken" });
  }
});

// User login
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
app.get('/active-users-count', async (req,res) => {
  try{
    const activeUsers = await User.countDocuments({status: true});
    res.status(200).json({activeUsers});

  } catch(error){
    res.status(404).json({message: error.message});
  }
});

// disable users count
app.get('/disable-users-count', async (req, res) => {
  try{
    const disableUsers = await User.countDocuments({status: false});
    res.status(200).send({disableUsers});
  }catch(error){
    res.status(404).json({message: error.message});
  }
})


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
  const {  email, description } = req.body;
  const query = new Query({  email, description });
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
