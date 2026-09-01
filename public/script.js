const socket = io();

let currentUsername = '';
let currentRoom = 'general';

function joinChat() {
  const usernameInput = document.getElementById('username').value.trim();
  const roomInput = document.getElementById('room').value.trim();
  
  if (!usernameInput) {
    alert('Please enter a username');
    return;
  }

  currentUsername = usernameInput;
  currentRoom = roomInput || 'general';

  document.getElementById('login').classList.add('hidden');
  document.getElementById('chat').classList.remove('hidden');
  document.getElementById('room-name').textContent = currentRoom;

  socket.emit('join', { username: currentUsername, room: currentRoom });
}

function sendMessage() {
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  
  if (text) {
    socket.emit('chat_message', { text });
    input.value = '';
  }
}

function addMessage(msg) {
  const messagesDiv = document.getElementById('messages');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message';
  
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  msgDiv.innerHTML = `
    <span class="time">[${time}]</span>
    <strong>${msg.username}:</strong> ${msg.text}
  `;
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

socket.on('history', (messages) => {
  messages.forEach(msg => addMessage(msg));
});

socket.on('chat_message', (msg) => {
  addMessage(msg);
});

socket.on('user_count', (count) => {
  document.getElementById('user-count').textContent = `${count} user${count !== 1 ? 's' : ''} online`;
});

socket.on('user_joined', (data) => {
  const messagesDiv = document.getElementById('messages');
  const joinDiv = document.createElement('div');
  joinDiv.className = 'system';
  joinDiv.textContent = `${data.username} joined the room (${data.userCount} online)`;
  messagesDiv.appendChild(joinDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on('user_left', (data) => {
  const messagesDiv = document.getElementById('messages');
  const leaveDiv = document.createElement('div');
  leaveDiv.className = 'system';
  leaveDiv.textContent = `${data.username} left the room (${data.userCount} online)`;
  messagesDiv.appendChild(leaveDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on('error', (data) => {
  alert(data.message);
});

// Allow sending with Enter key
document.getElementById('message-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});