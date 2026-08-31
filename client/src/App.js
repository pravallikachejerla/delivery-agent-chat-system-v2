import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'ws://localhost:5000';
const socket = io(SOCKET_URL.replace('ws', 'http'));

// Mock customer and agent IDs
const CUSTOMER_ID = 'cust-001';
const AGENT_ID = 'agent-001';
const DESTINATION = { latitude: 37.7749, longitude: -122.4194 }; // SF example

function LocationMarker({ onLocationChange }) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng);
    },
  });
  return null;
}

function App() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [agentLocation, setAgentLocation] = useState({ lat: 37.7749, lng: -122.4194 });
  const [eta, setEta] = useState(18);
  const [status, setStatus] = useState('enroute');
  const [notifications, setNotifications] = useState([]);
  const chatRef = useRef(null);

  useEffect(() => {
    socket.emit('join', { role: 'customer', id: CUSTOMER_ID });

    socket.on('agent-update', (data) => {
      if (data.agentId === AGENT_ID) {
        setAgentLocation({ lat: data.location.latitude, lng: data.location.longitude });
        setEta(data.eta);
        setStatus(data.status);
      }
    });

    socket.on('chat', (data) => {
      setMessages(prev => [...prev, data]);
      if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    });

    socket.on('notification', (notif) => {
      setNotifications(prev => [...prev, notif]);
      setTimeout(() => setNotifications(n => n.filter(i => i !== notif)), 8000);
    });

    socket.on('chat-sent', (data) => {
      setMessages(prev => [...prev, { ...data, from: 'You' }]);
    });

    return () => socket.off();
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit('chat', {
      from: CUSTOMER_ID,
      to: 'agent',
      message,
      agentId: AGENT_ID
    });
    setMessage('');
  };

  const updateAgentLocation = (newLoc) => {
    const payload = {
      agentId: AGENT_ID,
      lat: newLoc.lat,
      lng: newLoc.lng,
      destination: DESTINATION
    };
    socket.emit('update-location', payload);
    setAgentLocation(newLoc);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: 320, padding: 20, background: '#f5f5f5', overflowY: 'auto', borderRight: '1px solid #ddd' }}>
        <h2>Delivery Agent Chat v2</h2>
        
        <div style={{ background: '#e8f5e9', padding: 12, borderRadius: 4, marginBottom: 16 }}>
          Agent Status: <span style={{ background: '#4caf50', color: 'white', padding: '2px 8px', borderRadius: 12, fontSize: '0.8em' }}>{status}</span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <strong>ETA:</strong> {eta} minutes
        </div>
        <div style={{ marginBottom: 24, fontSize: '0.9em', color: '#666' }}>
          Current Location: {agentLocation.lat.toFixed(4)}, {agentLocation.lng.toFixed(4)}
        </div>

        <h4>Notifications</h4>
        <div style={{ marginBottom: 24, minHeight: 120 }}>
          {notifications.length === 0 ? (
            <div style={{ color: '#666', fontStyle: 'italic' }}>No new notifications</div>
          ) : (
            notifications.map((n, i) => (
              <div key={i} style={{ background: '#fff3e0', padding: 10, marginBottom: 8, borderRadius: 4, fontSize: '0.9em' }}>
                {n.message}
              </div>
            ))
          )}
        </div>

        <h4>Chat with Agent</h4>
        <div ref={chatRef} style={{ height: 260, background: 'white', border: '1px solid #ddd', padding: 10, overflowY: 'auto', marginBottom: 10 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <strong>{msg.from}:</strong> {msg.message}
            </div>
          ))}
        </div>
        
        <div style={{ display: 'flex' }}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type message..."
            style={{ flex: 1, padding: 8, border: '1px solid #ccc' }}
          />
          <button onClick={sendMessage} style={{ padding: '8px 16px', background: '#1976d2', color: 'white', border: 'none', cursor: 'pointer' }}>Send</button>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={[37.7749, -122.4194]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[agentLocation.lat, agentLocation.lng]}>
            <Popup>Delivery Agent (ETA: {eta} min)</Popup>
          </Marker>
          <LocationMarker onLocationChange={updateAgentLocation} />
        </MapContainer>
        
        <div style={{ position: 'absolute', bottom: 20, left: 20, background: 'white', padding: 12, borderRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 1000 }}>
          Click map to simulate agent movement • Real-time updates via Socket.io
        </div>
      </div>
    </div>
  );
}

export default App;