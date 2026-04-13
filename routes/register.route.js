const router = require('express').Router();
const User = require('../models/WorkerModel');
const bcrypt = require('bcryptjs');
const { onlyWorker } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const Lead = require('../models/LeadModel');
// 🔥 ADDED: Notification Model import kiya
const Notification = require('../models/Notification'); 

// 🔥 ADDED: Notification save karne ka helper function
const logActivity = async (message, type, performedBy, leadName) => {
  try {
    // Check kar rahe hain ki data sahi aa raha hai ya nahi
    console.log("📢 Attempting to save notification:", { message, type, performedBy, leadName });

    const newNotif = new Notification({
      message: message || "Did something",
      type: type || "note",
      performedBy: performedBy || "User",
      leadName: leadName || "a Lead"
    });

    const savedNotif = await newNotif.save();
    console.log("✅ SUCCESS: Notification saved to Database!", savedNotif._id);
    
  } catch (err) {
    console.error("❌ DATABASE ERROR (Notification):", err.message);
  }
};

router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ fullName, email, password: hashedPassword });
    await newUser.save();

    // 🔥 NOTIFICATION LOG
    await logActivity("New worker registered", "add", fullName, "System");

    res.status(201).json({ message: "User created successfully!" });
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required!" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { 
        id: user._id,
        role: user.role,
        fullName: user.fullName 
      }, 
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      success: true,
      message: "Login successful!",
      token: token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error ho gaya!", error: err.message });
  }
});

router.post('/add-lead', onlyWorker, async (req, res) => {
  try {
    const { companyName, lastName } = req.body;

    if (!companyName || !lastName) {
      return res.status(400).json({ 
        success: false, 
        message: "Company Name aur Last Name bharna zaroori hai bhai!" 
      });
    }

    const newLead = new Lead({
      ...req.body,           
      createdBy: req.user.id, 
      workerName: req.user.fullName || "Worker (Need Re-login)" 
    });

    const savedLead = await newLead.save();

    // 🔥 NOTIFICATION LOG
    await logActivity("Created a new lead for", "add", req.user.fullName || "Worker", companyName);

    res.status(201).json({
      success: true,
      message: "Lead successfully create ho gayi hai!",
      lead: savedLead
    });

  } catch (err) {
    console.error("Lead Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error occurred while creating lead. Try again later!",
      error: err.message
    });
  }
});

router.get('/get-leads', onlyWorker,  async (req, res) => {
  try {
    const { category } = req.query; 
    let query = { createdBy: req.user.id };

    if (category && category !== "All") {
      query.category = category;
    }

    const leads = await Lead.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads
    });

  } catch (err) {
    console.error("Fetch Leads Error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server not able to fetch leads right now. Try again later!",
      error: err.message
    });
  }
});

router.post('/add-note/:id', onlyWorker, async (req, res) => {
  try {
    const { note } = req.body;
    const leadId = req.params.id;

    if (!note) {
      return res.status(400).json({ success: false, message: "Note khali nahi ho sakta!" });
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      {
        $push: { 
          timeline: { 
            note: note, 
            addedBy: req.user.fullName,
            timestamp: new Date()
          } 
        }
      },
      { new: true } 
    );

    // 🔥 NOTIFICATION LOG
    await logActivity("Added a new timeline note to", "note", req.user.fullName || "Worker", updatedLead.companyName);

    res.status(200).json({
      success: true,
      message: "Timeline updated!",
      timeline: updatedLead.timeline
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/update-lead/:id', onlyWorker, async (req, res) => {
  try {
    const leadId = req.params.id;
    
    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      { $set: req.body }, 
      { new: true }
    );

    // 🔥 NOTIFICATION LOG
    await logActivity("Updated lead details for", "update", req.user.fullName || "Worker", updatedLead.companyName);

    res.status(200).json({
      success: true,
      message: "Lead details updated successfully!",
      lead: updatedLead
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/edit-note/:leadId/:noteId', onlyWorker, async (req, res) => {
  try {
    const { leadId, noteId } = req.params;
    const { note } = req.body;

    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found!" });

    const noteIndex = lead.timeline.findIndex(n => n._id.toString() === noteId);
    if (noteIndex === -1) return res.status(404).json({ success: false, message: "Note not found!" });

    lead.timeline[noteIndex].note = note;
    await lead.save();

    // 🔥 NOTIFICATION LOG
    await logActivity("Edited a timeline note in", "note", req.user.fullName || "Worker", lead.companyName);

    res.status(200).json({ success: true, message: "Note updated!", timeline: lead.timeline });
  } catch (error) {
    console.log("Edit Note Error:", error);
    res.status(500).json({ success: false, message: "Server error while editing note." });
  }
});

router.delete('/delete-note/:leadId/:noteId', onlyWorker, async (req, res) => {
  try {
    const { leadId, noteId } = req.params;

    const lead = await Lead.findByIdAndUpdate(
      leadId,
      { $pull: { timeline: { _id: noteId } } },
      { new: true } 
    );

    if (!lead) return res.status(404).json({ success: false, message: "Lead not found!" });

    // 🔥 NOTIFICATION LOG
    await logActivity("Deleted a timeline note from", "delete", req.user.fullName || "Worker", lead.companyName);

    res.status(200).json({ success: true, message: "Note deleted!", timeline: lead.timeline });
  } catch (error) {
    console.log("Delete Note Error:", error);
    res.status(500).json({ success: false, message: "Server error while deleting note." });
  }
});

router.delete('/delete-lead/:id', onlyWorker, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedLead = await Lead.findByIdAndDelete(id); 

    if (!deletedLead) {
      return res.status(404).json({ success: false, message: "Lead not found!" });
    }

    // 🔥 NOTIFICATION LOG
    await logActivity("Permanently deleted the lead", "delete", req.user.fullName || "Worker", deletedLead.companyName);

    res.status(200).json({ success: true, message: "Lead completely deleted!" });
  } catch (error) {
    console.log("Delete Lead Error:", error);
    res.status(500).json({ success: false, message: "Server error while deleting lead." });
  }
});

module.exports = router;