require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/connectDB');
const workerRoutes = require('./routes/register.route');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// 1. Database Connect
connectDB();

// 2. Middlewares (CORS ko sabse upar rakho)
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://crm-imglobal-seven.vercel.app',
   
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

 

app.use(express.json()); // JSON data read karne ke liye

// 3. Routes
// Dhyan de: register.route.js mein agar path '/' hai, toh URL niche wala hoga
app.use('/api/workers', workerRoutes);  
app.use('/api/admin', adminRoutes);


// 4. Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`👉 API Endpoint: http://localhost:${PORT}/api/workers/register`);
});