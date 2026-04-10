const router = require('express').Router();
const User = require('../models/WorkerModel');
const bcrypt = require('bcryptjs');
const { onlyWorker } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const Lead = require('../models/LeadModel');

router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ fullName, email, password: hashedPassword });
    await newUser.save();

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
      { expiresIn: '1d' }
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
      // 🔥 SAFETY NET: Agar purana token hua toh crash nahi hoga, default naam le lega
      workerName: req.user.fullName || "Worker (Need Re-login)" 
    });

    const savedLead = await newLead.save();

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
    // 1. Frontend se bheji hui category nikalenge (URL query se)
    const { category } = req.query; 
    
    // 2. Default Query: Sirf ussi worker ki leads dikhao jisne login kiya hai
    let query = { createdBy: req.user.id };

    // 3. Category Filter Logic: 
    // Agar category 'All' nahi hai aur kuch aayi hai, toh query mein add kar do
    if (category && category !== "All") {
      query.category = category;
    }

    // 4. Database se leads dhundo aur nayi wali sabse upar dikhao (sort)
    const leads = await Lead.find(query).sort({ createdAt: -1 });

    // 5. Frontend ko mast data bhej do
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
      { new: true } // updated data wapas mangne ke liye
    );

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
    
    // Database mein update karo
    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      { $set: req.body }, // Jo bhi data frontend se aaye sab update kar do
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Lead details updated successfully!",
      lead: updatedLead
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/edit-note/:leadId/:noteId', async (req, res) => {
  try {
    const { leadId, noteId } = req.params;
    const { note } = req.body;

    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found!" });

    // Note dhoondo array ke andar
    const noteIndex = lead.timeline.findIndex(n => n._id.toString() === noteId);
    if (noteIndex === -1) return res.status(404).json({ success: false, message: "Note not found!" });

    // Note update karo aur save karo
    lead.timeline[noteIndex].note = note;
    await lead.save();

    res.status(200).json({ success: true, message: "Note updated!", timeline: lead.timeline });
  } catch (error) {
    console.log("Edit Note Error:", error);
    res.status(500).json({ success: false, message: "Server error while editing note." });
  }
});

// ==========================================
// 3. DELETE TIMELINE NOTE ROUTE
// ==========================================
router.delete('/delete-note/:leadId/:noteId', async (req, res) => {
  try {
    const { leadId, noteId } = req.params;

    // MongoDB ka $pull operator array me se specific item nikal deta hai
    const lead = await Lead.findByIdAndUpdate(
      leadId,
      { $pull: { timeline: { _id: noteId } } },
      { new: true } // Return updated document
    );

    if (!lead) return res.status(404).json({ success: false, message: "Lead not found!" });

    res.status(200).json({ success: true, message: "Note deleted!", timeline: lead.timeline });
  } catch (error) {
    console.log("Delete Note Error:", error);
    res.status(500).json({ success: false, message: "Server error while deleting note." });
  }
});

router.delete('/delete-lead/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // MongoDB ka findByIdAndDelete method direct document uda deta hai
    // Note: Agar teri leads 'Worker' model me save ho rahi hain toh 'Worker' likhna, 
    // agar 'Lead' model me ho rahi hain toh 'Lead' likhna.
    const deletedLead = await Lead.findByIdAndDelete(id); 

    if (!deletedLead) {
      return res.status(404).json({ success: false, message: "Lead not found!" });
    }

    res.status(200).json({ success: true, message: "Lead completely deleted!" });
  } catch (error) {
    console.log("Delete Lead Error:", error);
    res.status(500).json({ success: false, message: "Server error while deleting lead." });
  }
});

module.exports = router;