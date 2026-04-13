const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  message: { 
    type: String, 
    default: "Performed an action" 
  },
  type: { 
    type: String, 
    default: "note" 
  },
  performedBy: { 
    type: String, 
    default: "Worker/Admin" 
  },
  leadName: { 
    type: String, 
    default: "System/Unknown Lead" 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Agar purana model cache ho gaya ho toh usko override karega
module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);