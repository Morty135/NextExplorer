const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const minerSchema = new Schema({
  username: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  payoutAddress: { type: String },
  createdAt: { type: Date, default: Date.now },
  notes: { type: String }
});

module.exports = mongoose.model('Miner', minerSchema);