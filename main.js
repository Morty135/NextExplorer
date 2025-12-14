const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

const Admin = require("./models/admin.js");
const Miner = require("./models/miner.js");
const Worker = require("./models/worker.js");
const Share = require("./models/shares.js");

dotenv.config();

const app = express();
const port = process.env.PORT;

function requireAdmin(req, res, next) {
  if (!req.session.adminId) {
    return res.redirect("/login");
  }
  next();
}

const uri = process.env.MONGODB_CONNECTION_URI;
if (!uri) {
  console.error("Error: MONGODB_CONNECTION_URI is not defined.");
  process.exit(1);
}

mongoose
  .connect(uri)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "randomthingadwojawdjpa",
    resave: false,
    saveUninitialized: false
  })
);



app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res) => {
  res.redirect("/dashboard");
});



app.get("/login", (req, res) => {
  if (req.session.adminId) return res.redirect("/dashboard");
  res.render("login");
});



app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const admin = await Admin.findOne({ username });
  if (!admin)
  {
    return res.render("login", { error: "Invalid username or password" });
  }
  if (password !== admin.password)
  {
    return res.render("login", { error: "Invalid username or password" });
  }
  req.session.adminId = admin._id;
  res.redirect("/dashboard");
});



// dashboard site
app.get("/dashboard", requireAdmin, async (req, res) => {
  const admin = await Admin.findById(req.session.adminId);

  const miners = await Miner.find({});
  const workers = await Worker.find({});
  const shares = await Share.find({})
    .sort({ timestamp: -1 })
    .limit(200);
  
  for (const miner of miners) {
      miner.validShares = await Share.countDocuments({
        miner: miner._id,
        accepted: true
      });

      miner.invalidShares = await Share.countDocuments({
        miner: miner._id,
        accepted: false
      });

    const last = await Share.findOne({ miner: miner._id })
      .sort({ timestamp: -1 });

    miner.lastShare = last ? last.timestamp : null;
  }

  req.session.flash = req.session.flash || {};
  const flash = req.session.flash;
  req.session.flash = {};

  res.render("dashboard", {
    admin,
    miners,
    workers,
    shares,
    success: flash.success,
    error: flash.error
  });
});



app.get("/miner/:id", requireAdmin, async (req, res) => {
  const minerId = req.params.id;

  const miner = await Miner.findById(minerId);
  if (!miner) return res.send("Miner not found");

  const workers = await Worker.find({ miner: minerId });

  for (const w of workers) {
    w.validShares = await Share.countDocuments({
      worker: w._id,
      accepted: true
    });

    w.invalidShares = await Share.countDocuments({
      worker: w._id,
      accepted: false
    });

    const last = await Share.findOne({
      worker: w._id
    }).sort({ timestamp: -1 });

    w.lastShare = last ? last.timestamp : null;
  }

  res.render("workers", {
    miner,
    workers
  });
});



app.post("/addminer", async (req, res) =>{
  const { username, password } = req.body;
  try 
  {
    const newMiner = new Miner({
      username: username,
      password: password
    });
    await newMiner.save();
    req.session.flash = { success: "Miner added successfully." };
    res.redirect("/dashboard");
  }
  catch (error) 
  {
    req.session.flash = { error: "Error adding miner: " + error.message };
    res.redirect("/dashboard");
  }
});



app.post("/deleteminer", (req, res) =>{
  const { username } = req.body;
  Miner.findOneAndDelete({ username: username }).then(() => res.redirect("/dashboard"));
});



app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});



app.listen(port, () => {
  console.log(`Admin panel running at http://localhost:${port}`);
});
