const jwt = require('jsonwebtoken');

const onlyWorker = (req, res, next) => {
  try {
    // 1. Frontend se bheja gaya token pakdo
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Token missing or invalid!" });
    }

    const token = authHeader.split(' ')[1]; // 'Bearer <token>' se sirf token nikalo

    // 2. Token ko verify aur open karo (Secret Key .env wali honi chahiye)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Token ke andar ka data (id, fullName) req.user mein save karo
    req.user = decoded; 

    // 4. Sab theek hai toh route ko aage badhne do
    next();
    
  } catch (error) {
    return res.status(401).json({ message: "Token is not valid! Please login again." });
  }
};
// 🔥 YE WALA HISSA UPDATE KIYA HAI
const onlyAdmin = (req, res, next) => {
  // onlyWorker ne pehle hi req.user mein token ka data daal diya hai
  // Ab hum sirf check karenge ki role 'admin' hai ya nahi
  if (req.user && req.user.role === 'admin') {
    next(); // Agar admin hai toh aage badhne do
  } else {
    return res.status(403).json({ 
      message: "Access Denied: Bhai sirf Admin hi ye kar sakta hai!" 
    });
  }
};

module.exports = { onlyWorker, onlyAdmin };