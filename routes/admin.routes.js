const router = require('express').Router();
const Lead = require('../models/LeadModel');
const User = require('../models/WorkerModel');
const Notification = require('../models/Notification');    
const { onlyWorker, onlyAdmin } = require('../middleware/authMiddleware');
// 🔥 ADDED: Notification Model import kiya
const WorkerNotification = require('../models/workerNotification'); // Naya wala model Apna path check kar lena



router.get('/notifications', async (req, res) => {
  // return res.status(401).json({ message: "Testing session expire" });
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching notifications" });
  }
});

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

// 🔥 ROUTE: Add Admin Note & Send Notification to Worker
router.post('/add-note/:id',onlyWorker, onlyAdmin, async (req, res) => { // 🔥 onlyWorker hata diya taaki API crash na ho
  try {
    const { note, addedBy } = req.body;
    const leadId = req.params.id;

    if (!note) {
      return res.status(400).json({ success: false, message: "note does not exist!" });
    }

    // 1. Lead dhundo aur timeline array mein admin ka VIP note push karo
    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      {
        $push: { 
          timeline: { 
            note: note, 
            type: "admin_instruction", // Isse frontend pe Blue + Sparkle aayega
            addedBy: addedBy || "Ravi K Tiwari (Admin)", 
            timestamp: new Date()
          } 
        }
      },
      { new: true } // Updated data wapas laane ke liye
    );

    if (!updatedLead) {
      return res.status(404).json({ success: false, message: "lead not found!" });
    }

    // 2. 🔥 Admin ke Activity Log ke liye (Jo pehle se tha)
    await Notification.create({
      message: "Added an admin instruction to",
      type: "note",
      performedBy: addedBy || "Ravi K Tiwari (Admin)",
      leadName: updatedLead.companyName || "a lead"
    });

    // 3. 🔥 NAYA LOGIC: Worker ko direct Notification (Laal Dot) bhejne ke liye
    try {
        await WorkerNotification.create({
          message: note,
          type: 'admin_instruction',
          leadId: updatedLead._id,
          leadName: updatedLead.companyName || "Unknown Company",
          
          // 🔥 TERA WORKER ID: Apne Lead schema ke hisaab se check kar lena ki ID kahan save hoti hai
          targetWorkerId: updatedLead.workerId || updatedLead.createdBy, 
          
          addedBy: addedBy || "Ravi K Tiwari (Admin)"
        });
    } catch(notifError) {
        console.log("Timeline updated but failed to save Worker Notification:", notifError);
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


router.post('/broadcast',onlyWorker, onlyAdmin, async (req, res) => {
  try {
    const { message } = req.body;
   

    const newNotif = new WorkerNotification({
      message: message,
      type: 'global',
      targetWorkerId: null, // 🔥 NULL matlab sabko dikhega
      addedBy: 'Ravi K Tiwari (Admin)'
    });
    
    await newNotif.save();
    res.status(200).json({ success: true, message: "Broadcast sent!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Broadcast failed" });
  }
});

// 🔥 ROUTE: Get Broadcast History
router.get('/broadcast-history',onlyWorker, onlyAdmin, async (req, res) => {
  try {
   
    
    // Wo saare messages lao jo 'global' hain, latest wale upar (sort -1)
    const history = await WorkerNotification.find({ type: 'global' })
                                            .sort({ createdAt: -1 })
                                            .limit(20); // Last 20 messages
                                            
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    console.error("Fetch Broadcast History Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch history" });
  }
});


module.exports = router;