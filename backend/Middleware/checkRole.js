const jwt = require("jsonwebtoken");
require("dotenv").config();

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.roleId) {
      return res.status(401).json({ msg: "Non authentifié" });
    }
    if (!allowedRoles.includes(req.roleId)) {
      return res.status(403).json({ msg: "Accès non autorisé pour ce rôle" });
    } 
    next();
  };
};

module.exports = {checkRole};
