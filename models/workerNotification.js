const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  type: { type: String, default: 'admin_instruction' }, // 'global' ya 'admin_instruction'
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
  leadName: { type: String, default: '' },
  
  // 🔥 SABSE MAIN CHEEZ: Kisko bhejna hai? (Null matlab sabko)
  targetWorkerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', default: null }, 
  
  addedBy: { type: String, default: 'Ravi K Tiwari (Admin)' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WorkerNotification', notificationSchema);