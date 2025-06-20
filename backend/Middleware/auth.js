const jwt = require("jsonwebtoken");
require("dotenv").config();

const veritoken = (req, res, next) => {
  let token = req.cookies.token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  if (!token) {
    return res.status(401).json({ msg: 'Accès refusé, token non fourni' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.roleId = decoded.roleId;

    next();
  } catch (error) {
    console.error('Erreur de vérification du token:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Token expiré. Veuillez vous reconnecter.' });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ msg: 'Token invalide.' });
    }

    return res.status(500).json({ msg: 'Erreur interne lors de la vérification du token.' });
  }
};

module.exports = veritoken;
