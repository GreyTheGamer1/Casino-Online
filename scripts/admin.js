const socket = window.casinoSocket;

const adminLogin = document.getElementById('admin-login');
const adminUI = document.getElementById('admin-ui');
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminCodeInput = document.getElementById('admin-code');
const adminLoginError = document.getElementById('admin-login-error');
const adminJackpotInput = document.getElementById('admin-jackpot');
const playersOnlineSpan = document.getElementById('players-online');
const adminCommandInput = document.getElementById('admin-command');
const commandAutocomplete = document.getElementById('command-autocomplete');
const sendCommandBtn = document.getElementById('send-command');
const adminPlayerList = document.getElementById('admin-player-list');
const adminCommandLog = document.getElementById('admin-command-log');
const adminAnnouncementBar = document.getElementById('admin-announcement-bar');

let adminCode = '';
let players = [];
const commands = [
  '//addtokens', '//removetokens', '//ban', '//unban', '//leaderboard',
  '//broadcast', '//setmachine', '//resetplayer', '//toggle', '//stats',
  '//updateall', '//update', '//setjackpot'
];

function showAdminError(msg) {
  adminLoginError.textContent = msg;
}

function showAdminUI() {
  adminLogin.classList.add('hidden');
  adminUI.classList.remove('hidden');
}

function updatePlayerList(list) {
  adminPlayerList.innerHTML = '';
  players = list;
  playersOnlineSpan.textContent = list.length;
  list.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="${p.banned ? 'banned' : ''}">${p.name} (${p.tokens} tokens)${p.banned ? ' [BANNED]' : ''} - Machine: ${p.currentMachine}</span>`;
    adminPlayerList.appendChild(li);
  });
}

function addCommandLog(command, result) {
  const li = document.createElement('li');
  li.textContent = `${command} → ${result}`;
  adminCommandLog.prepend(li);
}

function showAnnouncement(msg) {
  adminAnnouncementBar.textContent = msg;
  adminAnnouncementBar.classList.add('active');
  setTimeout(() => adminAnnouncementBar.classList.remove('active'), 4000);
}

function autocompleteCommands(input) {
  const val = input.trim();
  if (!val.startsWith('//')) {
    commandAutocomplete.classList.remove('active');
    return;
  }
  const matches = commands.filter(cmd => cmd.startsWith(val));
  if (matches.length === 0) {
    commandAutocomplete.classList.remove('active');
    return;
  }
  commandAutocomplete.innerHTML = '';
  matches.forEach(cmd => {
    const div = document.createElement('div');
    div.textContent = cmd;
    div.onclick = () => {
      adminCommandInput.value = cmd + ' ';
      commandAutocomplete.classList.remove('active');
      adminCommandInput.focus();
    };
    commandAutocomplete.appendChild(div);
  });
  commandAutocomplete.classList.add('active');
}

adminLoginBtn.onclick = () => {
  const code = adminCodeInput.value.trim();
  if (!code) return showAdminError('Enter admin code');
  adminCode = code;
  // Test admin code by sending a harmless command
  socket.emit('adminCommand', { code, command: '//leaderboard' }, (res) => {
    if (res.error) return showAdminError('Invalid admin code');
    showAdminUI();
    socket.emit('adminCommand', { code, command: '//updateall' }, () => {});
  });
};

sendCommandBtn.onclick = () => {
  const command = adminCommandInput.value.trim();
  if (!command) return;
  socket.emit('adminCommand', { code: adminCode, command }, (res) => {
    addCommandLog(command, res.result);
    if (command.startsWith('//setjackpot')) {
      // update jackpot field
      const amount = command.split(' ')[1];
      adminJackpotInput.value = amount;
    }
    if (command.startsWith('//updateall')) {
      socket.emit('adminCommand', { code: adminCode, command: '//updateall' }, () => {});
    }
  });
  adminCommandInput.value = '';
  commandAutocomplete.classList.remove('active');
};

adminCommandInput.oninput = (e) => {
  autocompleteCommands(e.target.value);
};

adminCommandInput.onblur = () => {
  setTimeout(() => commandAutocomplete.classList.remove('active'), 200);
};

adminJackpotInput.onchange = () => {
  const amount = adminJackpotInput.value;
  if (!amount) return;
  socket.emit('adminCommand', { code: adminCode, command: `//setjackpot ${amount}` }, (res) => {
    addCommandLog(`//setjackpot ${amount}`, res.result);
  });
};

socket.on('adminPlayerList', updatePlayerList);
socket.on('adminPlayerUpdate', (p) => {
  const idx = players.findIndex(x => x.name === p.name);
  if (idx !== -1) players[idx] = p;
  updatePlayerList(players);
});
socket.on('adminCommandLog', ({ command, result }) => {
  addCommandLog(command, result);
});
socket.on('announcement', showAnnouncement);
socket.on('jackpot', (amount) => {
  adminJackpotInput.value = amount;
});

window.addEventListener('DOMContentLoaded', () => {
  adminJackpotInput.value = '';
}); 