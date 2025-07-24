const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  tokens: { type: Number, default: 1000000 },
  banned: { type: Boolean, default: false },
  stats: { type: Object, default: {} },
  currentMachine: { type: Number, default: 0 },
  lastLogin: { type: Date, default: Date.now }
});

const Player = mongoose.model('Player', playerSchema);

module.exports = { Player }; 