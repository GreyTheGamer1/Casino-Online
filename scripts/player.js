const socket = window.casinoSocket;

const loginScreen = document.getElementById('login-screen');
const gameUI = document.getElementById('game-ui');
const loginBtn = document.getElementById('login-btn');
const nameInput = document.getElementById('player-name');
const codeInput = document.getElementById('player-code');
const loginError = document.getElementById('login-error');
const tokensSpan = document.getElementById('player-tokens');
const currentMachineSpan = document.getElementById('current-machine');
const jackpotSpan = document.getElementById('global-jackpot');
const slotMachinesDiv = document.getElementById('slot-machines');
const spinBtn = document.getElementById('spin-btn');
const reels = [
  document.getElementById('reel-1'),
  document.getElementById('reel-2'),
  document.getElementById('reel-3'),
];
const spinResult = document.getElementById('spin-result');
const announcementBar = document.getElementById('announcement-bar');

let player = null;
let selectedMachine = 1;
let slotMachines = [];

function showLoginError(msg) {
  loginError.textContent = msg;
}

function showGameUI() {
  loginScreen.classList.add('hidden');
  gameUI.classList.remove('hidden');
}

function updatePlayerUI() {
  tokensSpan.textContent = player.tokens;
  currentMachineSpan.textContent = player.currentMachine || selectedMachine;
}

function updateJackpot(jackpot) {
  jackpotSpan.textContent = jackpot;
}

function showAnnouncement(msg) {
  announcementBar.textContent = msg;
  announcementBar.classList.add('active');
  setTimeout(() => announcementBar.classList.remove('active'), 4000);
}

function renderSlotMachines() {
  slotMachinesDiv.innerHTML = '';
  slotMachines.forEach(machine => {
    const div = document.createElement('div');
    div.className = 'machine-item' + (selectedMachine === machine.id ? ' selected' : '');
    div.innerHTML = `<div style="font-size:2em;">${machine.icon}</div><div>${machine.name}</div>`;
    div.onclick = () => {
      selectedMachine = machine.id;
      player.currentMachine = machine.id;
      renderSlotMachines();
      updatePlayerUI();
    };
    slotMachinesDiv.appendChild(div);
  });
}

function spinReelsAnimation(symbols) {
  reels.forEach((reel, i) => {
    reel.classList.add('spinning');
    setTimeout(() => {
      reel.classList.remove('spinning');
      reel.textContent = symbols[i];
    }, 700 + i * 100);
  });
}

loginBtn.onclick = () => {
  const name = nameInput.value.trim();
  const code = codeInput.value.trim();
  if (!name || !code) return showLoginError('Enter name and code');
  socket.emit('login', { name, code }, (res) => {
    if (res.error) return showLoginError(res.error);
    player = res.player;
    slotMachines = res.slotMachines;
    selectedMachine = player.currentMachine || 1;
    updateJackpot(res.jackpot);
    updatePlayerUI();
    renderSlotMachines();
    showGameUI();
    localStorage.setItem('casinoPlayer', JSON.stringify({ name, code }));
  });
};

spinBtn.onclick = () => {
  if (!player) return;
  spinBtn.disabled = true;
  spinResult.textContent = '';
  socket.emit('spin', { code: player.code, machineId: selectedMachine }, (res) => {
    spinBtn.disabled = false;
    if (res.error) {
      spinResult.textContent = res.error;
      return;
    }
    spinReelsAnimation(res.reels);
    setTimeout(() => {
      spinResult.textContent = res.win > 0 ? `You won ${res.win} tokens!` : 'No win, try again!';
      if (res.win >= res.jackpot) {
        spinResult.textContent = `JACKPOT! You won ${res.jackpot} tokens!`;
      }
    }, 1000);
    player.tokens = res.tokens;
    updateJackpot(res.jackpot);
    updatePlayerUI();
  });
};

socket.on('jackpot', updateJackpot);
socket.on('announcement', showAnnouncement);
socket.on('playerUpdate', (data) => {
  if (player && data.name === player.name) {
    player.tokens = data.tokens;
    updatePlayerUI();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('casinoPlayer');
  if (saved) {
    const { name, code } = JSON.parse(saved);
    nameInput.value = name;
    codeInput.value = code;
  }
}); 