require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const connectDB = require('./config/db');
const { initSocket } = require('./socket');
const labRoutes = require('./Routes/lab.route');
const authRoutes = require('./Routes/auth.route');
const resourceRoutes = require('./Routes/Resource.route');
const { initCronJobs } = require('./config/cronService');
const userRoutes = require('./Routes/Admin.user.route');
const notificationRoutes = require('./Routes/notification.route');
const bookingRoutes = require('./Routes/booking.route');
const app = express();

// Database Connection
connectDB();

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// 1. Create HTTP Server
const server = http.createServer(app);

// 2. Attach Socket.io to HTTP Server
initSocket(server);

initCronJobs();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);
// Root Health Check
app.get('/', (req, res) => {
  res.send('LabDynamix API Engine is running...');
});

const PORT = process.env.PORT || 5000;

// ✅ FIXED: Listen on `server`, NOT `app`
server.listen(PORT, () => console.log(`🚀 Server & Socket.io listening on port ${PORT}`));