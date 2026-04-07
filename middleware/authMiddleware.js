const jwt = require('jsonwebtoken');

const onlyWorker = (req, res, next) => {
  try {
    // 1. Frontend se bheja gaya token pakdo
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Token missing! Bhai pehle login kar." });
    }

    const token = authHeader.split(' ')[1]; // 'Bearer <token>' se sirf token nikalo

    // 2. Token ko verify aur open karo (Secret Key .env wali honi chahiye)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Token ke andar ka data (id, fullName) req.user mein save karo
    req.user = decoded; 

    // 4. Sab theek hai toh route ko aage badhne do
    next();
    
  } catch (error) {
    return res.status(401).json({ message: "Token expire ho gaya ya invalid hai! Phir se login karo." });
  }
};

module.exports = { onlyWorker };