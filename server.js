const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const haversine = require('haversine-distance');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const agents = new Map(); // agentId -> {location, status, eta, destination}
const customers = new Map(); // customerId -> socket

// Haversine helper for ETA (assuming avg speed 40km/h)
function calculateETA(loc1, loc2) {
  const distance = haversine(loc1, loc2) / 1000; // km
  const speedKmh = 40;
  const timeHours = distance / speedKmh;
  return Math.round(timeHours * 60); // minutes
}

// REST endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', agents: agents.size });
});

app.post('/api/agent/location', (req, res) => {
  const { agentId, lat, lng, destination } = req.body;
  if (!agentId || !lat || !lng) {
    return res.status(400).json({ error: 'Missing location data' });
  }
  
  const location = { latitude: parseFloat(lat), longitude: parseFloat(lng) };
  const prev = agents.get(agentId);
  const eta = destination ? calculateETA(location, destination) : prev ? prev.eta : 0;
  
  agents.set(agentId, { location, status: 'enroute', eta, destination, updated: new Date() });
  
  // Broadcast update
  io.emit('agent-update', { agentId, location, eta, status: 'enroute' });
  
  res.json({ success: true, eta });
});

app.get('/api/agent/:id', (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

// Socket.io for real-time chat + location
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join', ({ role, id }) => {
    if (role === 'customer') customers.set(id, socket);
    socket.join(role);
    socket.emit('joined', { role, id });
  });
  
  socket.on('chat', ({ from, to, message, agentId }) => {
    const payload = { from, message, timestamp: new Date(), agentId };
    io.to(to).emit('chat', payload);
    socket.emit('chat-sent', payload);
    
    // Auto-notification for agent
    if (agents.has(agentId)) {
      io.emit('notification', {
        type: 'chat',
        agentId,
        message: `New message from ${from}: ${message.substring(0, 30)}...`
      });
    }
  });
  
  socket.on('update-location', (data) => {
    const { agentId, lat, lng, destination } = data;
    const location = { latitude: parseFloat(lat), longitude: parseFloat(lng) };
    const eta = destination ? calculateETA(location, destination) : 15;
    
    agents.set(agentId, { location, status: 'enroute', eta, destination, updated: new Date() });
    
    io.emit('agent-update', { agentId, location, eta, status: 'enroute' });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Cleanup if customer
    for (let [key, value] of customers.entries()) {
      if (value === socket) customers.delete(key);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Delivery Agent Chat System v2 running on port ${PORT}`);
  console.log('Features: Real-time location, ETA calc, Socket chat, Notifications');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.close();
});