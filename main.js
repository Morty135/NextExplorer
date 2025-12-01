const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const  path = require("path");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

const Admin = require("./models/admin.js");
const Miner = require("./models/miner.js");
const Worker = require("./models/worker.js");
const Share = require("./models/shares.js");

dotenv.config();

const app = express();
const port = 3000;

// connect to PoolDB
const uri = process.env.MONGODB_CONNECTION_URI;
if (!uri) {
  console.error("Error: MONGODB_CONNECTION_URI is not defined in environment variables.");
  process.exit(1);
}

await mongoose.connect(uri);

// initialize middleware
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "randomthingadwojawdjpa",
    resave: false,
    saveUninitialized: false
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

// api routes

app.get("/", (req, res) => {
  res.redirect("/dashboard");
});

// LOGIN PAGE
app.get("/login", (req, res) => {
  if (req.session.adminId) return res.redirect("/dashboard");
  res.render("login");
});

// LOGIN SUBMIT
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const admin = await Admin.findOne({ username });
  if (!admin) {
    return res.render("login", { error: "Invalid username or password" });
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    return res.render("login", { error: "Invalid username or password" });
  }

  req.session.adminId = admin._id;
  res.redirect("/dashboard");
});

// DASHBOARD
app.get("/dashboard", requireAdmin, async (req, res) => {
  const admin = await Admin.findById(req.session.adminId);

  // Mining pool data
  const miners = await Miner.find({});
  const workers = await Worker.find({});
  const shares = await Share.find({}).sort({ timestamp: -1 }).limit(200);

  res.render("dashboard", {
    admin,
    miners,
    workers,
    shares
  });
});

// LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// starrt the app
app.listen(port, () => {
  console.log(`Admin panel running at http://localhost:${port}`);
});