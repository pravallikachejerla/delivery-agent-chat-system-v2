const { expect } = require('chai');
const io = require('socket.io-client');
const request = require('supertest');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Simple test server factory matching production logic
function createTestServer() {
  const app = require('express')();
  const httpServer = createServer(app);
  const ioServer = new Server(httpServer);
  
  const rooms = new Map();
  
  ioServer.on('connection', (socket) => {
    let currentUsername = null;
    let currentRoom = null;
    
    socket.on('join', (data) => {
      const { username, room = 'general' } = data;
      if (!username || typeof username !== 'string' || username.trim() === '') {
        socket.emit('error', { message: 'Username is required' });
        return;
      }
      
      currentUsername = username.trim();
      currentRoom = room.trim() || 'general';
      
      socket.join(currentRoom);
      
      if (!rooms.has(currentRoom)) {
        rooms.set(currentRoom, { messages: [], users: new Set() });
      }
      const roomData = rooms.get(currentRoom);
      roomData.users.add(socket.id);
      
      socket.emit('history', roomData.messages.slice(-100));
      socket.to(currentRoom).emit('user_joined', {
        username: currentUsername,
        userCount: roomData.users.size
      });
      ioServer.to(currentRoom).emit('user_count', roomData.users.size);
    });
    
    socket.on('chat_message', (data) => {
      if (!currentUsername || !currentRoom) return;
      
      const message = {
        id: 'msg_' + Date.now(),
        username: currentUsername,
        text: data.text ? data.text.trim() : '',
        timestamp: new Date().toISOString(),
        room: currentRoom
      };
      
      const roomData = rooms.get(currentRoom);
      if (roomData && message.text) {
        roomData.messages.push(message);
        if (roomData.messages.length > 100) roomData.messages.shift();
      }
      
      ioServer.to(currentRoom).emit('chat_message', message);
    });
    
    socket.on('disconnect', () => {
      if (currentRoom && rooms.has(currentRoom)) {
        const roomData = rooms.get(currentRoom);
        roomData.users.delete(socket.id);
        const remaining = roomData.users.size;
        ioServer.to(currentRoom).emit('user_count', remaining);
        if (currentUsername) {
          ioServer.to(currentRoom).emit('user_left', {
            username: currentUsername,
            userCount: remaining
          });
        }
        if (remaining === 0) rooms.delete(currentRoom);
      }
    });
  });
  
  return { httpServer, ioServer, rooms };
}

describe('Basic Chat Application', () => {
  let testServer;
  let httpServer;
  let ioServer;
  let rooms;
  
  beforeEach((done) => {
    const srv = createTestServer();
    testServer = srv.httpServer;
    ioServer = srv.ioServer;
    rooms = srv.rooms;
    testServer.listen(0, () => done()); // random port
  });
  
  afterEach((done) => {
    ioServer.close(() => {
      testServer.close(done);
    });
  });
  
  // Normal path
  it('should allow user to join room, send message, and receive it in real-time', (done) => {
    const client = io(`http://localhost:${testServer.address().port}`, {
      transports: ['websocket']
    });
    
    let messagesReceived = 0;
    
    client.on('connect', () => {
      client.emit('join', { username: 'testuser', room: 'testroom' });
    });
    
    client.on('history', (history) => {
      expect(history).to.be.an('array');
      client.emit('chat_message', { text: 'Hello from test' });
    });
    
    client.on('chat_message', (msg) => {
      expect(msg.username).to.equal('testuser');
      expect(msg.text).to.equal('Hello from test');
      expect(msg.room).to.equal('testroom');
      messagesReceived++;
      if (messagesReceived === 1) {
        client.disconnect();
        done();
      }
    });
    
    client.on('user_count', (count) => {
      expect(count).to.be.at.least(1);
    });
  });
  
  // Edge case
  it('should retain only the last 100 messages per room', (done) => {
    const client = io(`http://localhost:${testServer.address().port}`, {
      transports: ['websocket']
    });
    
    client.on('connect', () => {
      client.emit('join', { username: 'overflowuser', room: 'overflow' });
    });
    
    client.on('history', () => {
      // Send 105 messages
      for (let i = 0; i < 105; i++) {
        client.emit('chat_message', { text: `message ${i}` });
      }
      
      // Give time for processing
      setTimeout(() => {
        const roomData = rooms.get('overflow');
        expect(roomData).to.exist;
        expect(roomData.messages.length).to.equal(100);
        expect(roomData.messages[0].text).to.equal('message 5'); // oldest dropped
        client.disconnect();
        done();
      }, 300);
    });
  });
  
  // Error case
  it('should reject join with empty username and emit error', (done) => {
    const client = io(`http://localhost:${testServer.address().port}`, {
      transports: ['websocket']
    });
    
    client.on('connect', () => {
      client.emit('join', { username: '' });
    });
    
    client.on('error', (err) => {
      expect(err.message).to.equal('Username is required');
      client.disconnect();
      done();
    });
  });
  
  // HTTP smoke test (normal path for serving UI)
  it('should serve the chat UI on GET /', async () => {
    const response = await request(testServer)
      .get('/')
      .expect(200);
    
    expect(response.text).to.include('<title>Basic Chat</title>');
    expect(response.text).to.include('socket.io/socket.io.js');
  });
});