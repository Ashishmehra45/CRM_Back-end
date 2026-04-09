const router = require('express').Router();
const Lead = require('../models/LeadModel');
const User = require('../models/registerModel');    
const { onlyWorker, onlyAdmin } = require('../middleware/authMiddleware');

router.get('/admin-stats', onlyWorker, onlyAdmin, async (req, res) => {
  try {
    const [leads, workers] = await Promise.all([
      Lead.find(),
      User.find({ role: 'worker' })
    ]);

    const statsMap = {};
    // Sabse pehle saare workers ko map mein daalo
    workers.forEach(w => {
      // Key ko lowercase rakhenge taaki matching aasaan ho
      const key = w.fullName.toLowerCase().trim();
      statsMap[key] = { 
        name: w.fullName, // Original naam display ke liye
        total: 0, fdi: 0, cip: 0, pmu: 0, representation: 0 
      };
    });

    leads.forEach(lead => {
      // Lead ke andar se workerName uthao aur lowercase karo
      const leadWorker = lead.workerName?.toLowerCase().trim();
      
      if (leadWorker && statsMap[leadWorker]) {
        statsMap[leadWorker].total += 1;
        const cat = lead.category?.toLowerCase().trim();
        if (cat === "fdi") statsMap[leadWorker].fdi += 1;
        else if (cat === "cip") statsMap[leadWorker].cip += 1;
        else if (cat === "national pmu" || cat === "pmu") statsMap[leadWorker].pmu += 1;
        else if (cat === "representation") statsMap[leadWorker].representation += 1;
      }
    });

    res.status(200).json({
      success: true,
      totalLeads: leads.length,
      workerBreakdown: Object.values(statsMap)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
  
});
router.get('/get-all-leads', onlyWorker, onlyAdmin, async (req, res) => {
  try {
    // Bina kisi 'createdBy' filter ke saari leads utha lo (Latest wali upar)
    const allLeads = await Lead.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: allLeads.length,
      data: allLeads // Ye wahi 'leadsData' hai jo frontend table me dikhega
    });

  } catch (err) {
    console.error("Admin Get Leads Error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error occurred while fetching leads." 
    });
  }
});

// =========================================================
// 2. ADMIN TIMELINE NOTE (Ye Timeline me Boss Note dalega)
// =========================================================
router.post('/add-note/:id', onlyWorker, onlyAdmin, async (req, res) => {
  try {
    const { note, addedBy } = req.body;
    const leadId = req.params.id;

    if (!note) {
      return res.status(400).json({ success: false, message: "Note khali nahi ho sakta!" });
    }

    // Lead dhundo aur timeline array mein admin ka VIP note push karo
    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      {
        $push: { 
          timeline: { 
            note: note, 
            type: "admin_instruction", // Isse frontend pe Blue + Sparkle aayega
            addedBy: addedBy || "Admin", 
            timestamp: new Date()
          } 
        }
      },
      { new: true } // Updated data wapas laane ke liye
    );

    if (!updatedLead) {
      return res.status(404).json({ success: false, message: "Lead nahi mili!" });
    }

    res.status(200).json({
      success: true,
      message: "Official instruction sent!",
      timeline: updatedLead.timeline
    });

  } catch (err) {
    console.error("Admin Add Note Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
module.exports = router;