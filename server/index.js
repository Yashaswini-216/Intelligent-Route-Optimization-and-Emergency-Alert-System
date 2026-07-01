import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Alert from './models/Alert.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Calculate distance between two coordinates (Haversine formula)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; // Distance in km
};

// Using In-Memory mock for prototype (no MongoDB required)

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Fetch active validated alerts for the initial map load
  socket.on('get_active_alerts', async () => {
    try {
      const activeAlerts = await Alert.find({ isValidated: true });
      socket.emit('active_alerts', activeAlerts);
    } catch (err) {
      console.error('Error fetching alerts', err);
    }
  });

  // Handle a new accident report
  socket.on('report_accident', async (data) => {
    const { latitude, longitude } = data;
    try {
      // Check if there is an existing alert near this location (e.g., within 100 meters)
      const pendingAlerts = await Alert.find({ isValidated: false });
      let existingAlert = null;
      
      for (let alert of pendingAlerts) {
        if (getDistance(latitude, longitude, alert.latitude, alert.longitude) <= 0.1) {
          existingAlert = alert;
          break;
        }
      }

      if (existingAlert) {
        // If user already reported/confirmed it, ignore
        if (!existingAlert.reportedBy.includes(socket.id)) {
          existingAlert.reportedBy.push(socket.id);
          existingAlert.confirmations += 1;
          
          if (existingAlert.confirmations >= 3) {
            existingAlert.isValidated = true;
            // Broadcast the validated alert to all clients
            io.emit('alert_validated', existingAlert);
          }
          await existingAlert.save();
        }
      } else {
        // Create a new pending alert
        const newAlert = new Alert({
          latitude,
          longitude,
          reportedBy: [socket.id]
        });
        await newAlert.save();
        
        // Broadcast the pending alert to nearby users for confirmation
        // In a real app, we would only broadcast to users near this location, but for prototype we broadcast to all
        io.emit('new_pending_alert', newAlert);
      }
    } catch (error) {
      console.error('Error reporting accident', error);
    }
  });

  socket.on('confirm_alert', async (data) => {
    try {
      const alert = await Alert.findById(data.alertId);
      if (alert && !alert.reportedBy.includes(socket.id)) {
        alert.reportedBy.push(socket.id);
        alert.confirmations += 1;
        
        if (alert.confirmations >= 3) {
          alert.isValidated = true;
          io.emit('alert_validated', alert);
        }
        await alert.save();
      }
    } catch (error) {
      console.error('Error confirming alert', error);
    }
  });

  socket.on('reject_alert', async (data) => {
    try {
      const alert = await Alert.findById(data.alertId);
      if (alert && !alert.reportedBy.includes(socket.id)) {
        alert.reportedBy.push(socket.id);
        alert.rejections += 1;
        
        // If it gets too many rejections, we might want to delete it
        if (alert.rejections >= 3) {
          await Alert.findByIdAndDelete(data.alertId);
          io.emit('alert_rejected', { alertId: data.alertId });
        } else {
          await alert.save();
        }
      }
    } catch (error) {
      console.error('Error rejecting alert', error);
    }
  });

  // Ambulance Broadcasting System
  socket.on('ambulance_location', (data) => {
    // Broadcast the ambulance's lat/lng to all OTHER connected clients (civilians)
    socket.broadcast.emit('ambulance_nearby', data);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Clear all alerts (for demo reset)
app.post('/api/alerts/clear', async (req, res) => {
  try {
    await Alert.deleteMany();
    io.emit('active_alerts', []); 
    io.emit('clear_pending_alerts'); // New signal to clear pending lists
    res.json({ message: 'All alerts cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
