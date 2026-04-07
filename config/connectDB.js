const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Modern Mongoose mein options ki zaroorat nahi hoti
    const conn = await mongoose.connect(process.env.MONGO_URI);
    
    console.log(`✅ CRM Database Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1); // App band kar do agar DB connect na ho
  }
};

module.exports = connectDB;