const router = require('express').Router();
const User = require('../models/registerModel');
const bcrypt = require('bcryptjs');
// const { onlyWorker } = require('../middleware/middleware/authMiddleware');
const jwt = require('jsonwebtoken');

router.post('/register',  async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    // Hash password
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

    // 1. Validation: Check karo fields khali toh nahi hain
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required!" });
    }

    // 2. User ko dhundo email se
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 3. Password Check: Jo password aaya hai usko hashed password se match karo
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // 4. Token Generation: Agar sab sahi hai toh JWT Token banao
    // Isme hum User ID aur Role (worker/admin) payload mein daal rahe hain
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, // Ye aapki .env file mein hona chahiye
      { expiresIn: '1d' }      // Token 1 din tak valid rahega
    );

    // 5. Success Response: Token aur User details (minus password) wapas bhejo
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

module.exports = router;