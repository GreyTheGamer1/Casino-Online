const { Player } = require('./db');

let globalJackpot = 500000;
let features = { multiplayer: false };

const slotMachines = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  name: `Neon Machine #${i + 1}`,
  icon: `🎰`,
}));

function getRandomReels() {
  const symbols = ['🍒', '🍋', '🔔', '💎', '7️⃣', '🍀', '👾', '🛸', '💰', '🎲'];
  return [0, 1, 2].map(() => symbols[Math.floor(Math.random() * symbols.length)]);
}

function checkWin(reels) {
  // Simple win: all three match
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    return 1000;
  }
  // Two match
  if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
    return 100;
  }
  return 0;
}

function gameLogic(io) {
  io.on('connection', (socket) => {
    socket.on('login', async ({ name, code }, cb) => {
      let player = await Player.findOne({ code });
      if (!player) {
        player = await Player.create({ name, code });
      } else {
        player.lastLogin = new Date();
        await player.save();
      }
      if (player.banned) return cb({ error: 'Banned' });
      cb({ player, jackpot: globalJackpot, slotMachines });
      io.emit('announcement', `${player.name} logged in!`);
    });

    socket.on('spin', async ({ code, machineId }, cb) => {
      const player = await Player.findOne({ code });
      if (!player || player.banned) return cb({ error: 'Invalid or banned' });
      if (player.tokens < 100) return cb({ error: 'Not enough tokens' });
      player.tokens -= 100;
      const reels = getRandomReels();
      const win = checkWin(reels);
      player.tokens += win;
      if (win >= globalJackpot) {
        player.tokens += globalJackpot;
        globalJackpot = 500000;
        io.emit('jackpot', globalJackpot);
        io.emit('announcement', `${player.name} HIT THE JACKPOT!`);
      }
      await player.save();
      cb({ reels, win, tokens: player.tokens, jackpot: globalJackpot });
      io.emit('playerUpdate', { name: player.name, tokens: player.tokens });
    });

    // Admin commands
    socket.on('adminCommand', async ({ code, command }, cb) => {
      if (code !== process.env.ADMIN_CODE) return cb({ error: 'Unauthorized' });
      const [cmd, ...args] = command.trim().split(/\s+/);
      let result = '';
      try {
        switch (cmd) {
          case '//addtokens': {
            const [playerName, amount] = args;
            const p = await Player.findOne({ name: playerName });
            if (!p) throw 'Player not found';
            p.tokens += parseInt(amount);
            await p.save();
            result = `Added ${amount} tokens to ${playerName}`;
            break;
          }
          case '//removetokens': {
            const [playerName, amount] = args;
            const p = await Player.findOne({ name: playerName });
            if (!p) throw 'Player not found';
            p.tokens = Math.max(0, p.tokens - parseInt(amount));
            await p.save();
            result = `Removed ${amount} tokens from ${playerName}`;
            break;
          }
          case '//ban': {
            const [playerName] = args;
            const p = await Player.findOne({ name: playerName });
            if (!p) throw 'Player not found';
            p.banned = true;
            await p.save();
            result = `Banned ${playerName}`;
            io.emit('announcement', `${playerName} was banned!`);
            break;
          }
          case '//unban': {
            const [playerName] = args;
            const p = await Player.findOne({ name: playerName });
            if (!p) throw 'Player not found';
            p.banned = false;
            await p.save();
            result = `Unbanned ${playerName}`;
            break;
          }
          case '//leaderboard': {
            const top = await Player.find().sort({ tokens: -1 }).limit(10);
            result = top.map(p => `${p.name}: ${p.tokens}`).join(', ');
            break;
          }
          case '//broadcast': {
            const msg = args.join(' ');
            io.emit('announcement', msg);
            result = 'Broadcast sent';
            break;
          }
          case '//setmachine': {
            const [playerName, machineId] = args;
            const p = await Player.findOne({ name: playerName });
            if (!p) throw 'Player not found';
            p.currentMachine = parseInt(machineId);
            await p.save();
            result = `Set ${playerName} to machine ${machineId}`;
            break;
          }
          case '//resetplayer': {
            const [playerName] = args;
            const p = await Player.findOne({ name: playerName });
            if (!p) throw 'Player not found';
            p.tokens = 1000000;
            p.stats = {};
            p.currentMachine = 0;
            await p.save();
            result = `Reset ${playerName}`;
            break;
          }
          case '//toggle': {
            const [feature] = args;
            features[feature] = !features[feature];
            result = `Feature ${feature} is now ${features[feature]}`;
            break;
          }
          case '//stats': {
            const [playerName] = args;
            const p = await Player.findOne({ name: playerName });
            if (!p) throw 'Player not found';
            result = JSON.stringify(p.stats);
            break;
          }
          case '//updateall': {
            const players = await Player.find();
            io.emit('adminPlayerList', players);
            result = 'All players updated';
            break;
          }
          case '//update': {
            const [playerName] = args;
            const p = await Player.findOne({ name: playerName });
            if (!p) throw 'Player not found';
            io.emit('adminPlayerUpdate', p);
            result = `Updated ${playerName}`;
            break;
          }
          case '//setjackpot': {
            const [amount] = args;
            globalJackpot = parseInt(amount);
            io.emit('jackpot', globalJackpot);
            result = `Jackpot set to ${amount}`;
            break;
          }
          default:
            result = 'Unknown command';
        }
      } catch (e) {
        result = `Error: ${e}`;
      }
      cb({ result });
      io.emit('adminCommandLog', { command, result });
    });

    // Placeholder for multiplayer game events
    socket.on('joinRoom', (data, cb) => {
      // TODO: Implement room join logic
      cb && cb({ ok: true });
    });
    socket.on('leaveRoom', (data, cb) => {
      // TODO: Implement room leave logic
      cb && cb({ ok: true });
    });
    socket.on('gameAction', (data, cb) => {
      // TODO: Implement multiplayer game actions
      cb && cb({ ok: true });
    });
  });
}

module.exports = gameLogic; 