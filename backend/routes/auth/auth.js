/*
** 1- Vérifier que l'utilisateur connecté peut créer ce type d'utilisateur
** 2- Règle 1: Un CRP (id=2) peut seulement créer un Grossiste (id=3)
** 2- Règle 2: Un Grossiste (id=3) peut seulement créer un Revendeur (id=4)
** 3- Si l'utilisateur n'est ni admin (id=1) ni CRP (id=2) ni Grossiste (id=3), il ne peut pas créer d'utilisateur
** 4- Vérifier si l'utilisateur à activer existe
** 5- Vérifier les permissions d'activation selon la hiérarchie
** 5- Un CRP peut activer un Grossiste, un Grossiste peut activer un Revendeur
** 6- Vérifier si l'utilisateur à désactiver existe
** 7- Vérifier les permissions de désactivation selon la hiérarchie
*/

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../../config/db");
// const authMiddleware = require("../../Middleware/authMiddleware");
const veritoken = require("../../Middleware/auth");
require("dotenv").config();
const router = express.Router();
const crypto = require('crypto');
const sendMail = require('../../config/mail');

router.post("/gen-admin-token", (req, res) => {
  const adminPayload = {
    userId: 1,
    roleId: 1,
    pseudo: "adminsupr",
  };
  
  const token = jwt.sign(adminPayload, process.env.JWT_SECRET, { expiresIn: "3h" });
  return res.status(201).json({ token });
});


// Route pour générer le lien d'inscription
router.get("/api/gen-user/:id", veritoken, async (req, res) => {
  try {
    const parentId = req.userId;
    const targetRoleId = parseInt(req.params.id);
    const userRoleId = req.roleId;
    const { pass_id } = req.query;

    if (!parentId || !userRoleId) {
      return res.status(403).json({ 
        msg: "Utilisateur non authentifié ou rôle non défini" 
      });
    }

    if (userRoleId !== 1 && userRoleId !== 2 && userRoleId !== 3) {
      return res.status(403).json({ 
        msg: "Vous n'êtes pas autorisé à créer des utilisateurs" 
      });
    }

    if ((userRoleId === 2 && targetRoleId !== 3) || 
        (userRoleId === 3 && targetRoleId !== 4)) {
      return res.status(403).json({ 
        msg: "Vous n'êtes pas autorisé à créer ce type d'utilisateur" 
      });
    }

    if (targetRoleId < 1 || targetRoleId > 4) {
      return res.status(400).json({ 
        msg: "Le role_id doit avoir une valeur comprise entre 1 et 4" 
      });
    }

    const ROLE_PASSWORDS = {
      1: "admin_secret",
      2: "crp_secret",
      3: "gros_secret",
    };

    if (ROLE_PASSWORDS[targetRoleId] && pass_id !== ROLE_PASSWORDS[targetRoleId]) {
      return res.status(403).json({ 
        msg: "Mot de passe de confirmation incorrect" 
      });
    }

    // Générer un token unique
    const uniqueToken = crypto.randomBytes(32).toString('hex');
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 12);

    const insertTokenQuery = `
      INSERT INTO invitation_tokens (token, parent_id, role_id, expires_at) 
      VALUES (?, ?, ?, ?)
    `;
    
    await db.execute(insertTokenQuery, [
      uniqueToken, 
      parentId, 
      targetRoleId, 
      expiresAt
    ]);

    // Générer le lien d'inscription
    const baseUrl = `${process.env.FRONTEND_URL}` || 'http://localhost:3000';
    const registrationLink = `${baseUrl}/register?token=${uniqueToken}`;

    // if ()

    res.status(200).json({
      message: "Lien d'inscription généré avec succès",
      link: registrationLink,
      token: uniqueToken,
      expires_at: expiresAt,
      valid_for_role: targetRoleId
    });

  } catch (error) {
    console.error('Erreur lors de la génération du lien:', error);
    res.status(500).json({ 
      msg: "Erreur serveur lors de la génération du lien",
      error: error.message 
    });
  }
});

router.post("/api/users", async (req, res) => {
  const { 
    nom, prenoms, age, pseudo, email, telephone, 
    mot_de_passe, conf_mot_de_passe, role_id, cip, 
    parent_id, invitation_token 
  } = req.body;

  try {
    let actualParentId = parent_id;
    let actualRoleId = role_id;
    let userRoleId;

    if (invitation_token) {
      const tokenQuery = `SELECT * FROM invitation_tokens 
        WHERE token = ? AND expires_at > NOW()`;

      const [tokenResults] = await db.execute(tokenQuery, [invitation_token]);

      if (tokenResults.length === 0) {
        return res.status(400).json({ 
          msg: "Token d'invitation invalide ou expiré" 
        });
      }



      const tokenData = tokenResults[0];
      actualParentId = tokenData.parent_id;
      actualRoleId = tokenData.role_id;

      await db.execute(
        `UPDATE invitation_tokens SET used = used + 1 WHERE token = ?`, 
        [invitation_token]
      );

    } else {
      const authResult = await verifyToken(req);
      if (!authResult.success) {
        return res.status(403).json({ msg: authResult.message });
      }
      
      userRoleId = authResult.roleId;
      
      if (!userRoleId) {
        return res.status(403).json({ 
          msg: "Utilisateur non authentifié ou rôle non défini" 
        });
      }

      const ROLE_PASSWORDS = {
        1: "admin_secret",
        2: "crp_secret", 
        3: "gros_secret",
      };

      if ((userRoleId === 2 && role_id !== 3) || 
          (userRoleId === 3 && role_id !== 4)) {
        return res.status(403).json({ 
          msg: "Vous n'êtes pas autorisé à créer ce type d'utilisateur" 
        });
      }

      if (userRoleId !== 1 && userRoleId !== 2 && userRoleId !== 3) {
        return res.status(403).json({ 
          msg: "Vous n'êtes pas autorisé à créer des utilisateurs" 
        });
      }

      const { pass_id } = req.body;
      if (ROLE_PASSWORDS[role_id] && pass_id !== ROLE_PASSWORDS[role_id]) {
        return res.status(403).json({ 
          msg: "Mot de passe de confirmation incorrect" 
        });
      }

      actualParentId = parent_id || authResult.userId;
    }

    if (!nom || !prenoms || !age || !pseudo || !email || !telephone || 
        !mot_de_passe || !conf_mot_de_passe) {
      return res.status(400).json({ 
        msg: "Tous les champs sont requis" 
      });
    }

    if (actualRoleId < 1 || actualRoleId > 4) {
      return res.status(400).json({ 
        msg: "Le role_id doit avoir une valeur comprise entre 1 et 4" 
      });
    }

    if (mot_de_passe !== conf_mot_de_passe) {
      return res.status(400).json({ 
        msg: "Les mots de passe ne correspondent pas" 
      });
    }

    const existingUserQuery = `
      SELECT * FROM utilisateurs 
      WHERE pseudo = ? OR email = ? OR telephone = ?
    `;
    const [results] = await db.execute(existingUserQuery, [pseudo, email, telephone]);
    
    if (results.length > 0) {
      return res.status(400).json({ 
        msg: "Un utilisateur avec ce pseudo, email ou téléphone existe déjà" 
      });
    }

    const hashedPassword = await bcrypt.hash(mot_de_passe, 12);
    
    // Insertion
    const sql = `
      INSERT INTO utilisateurs (
        nom, prenoms, age, pseudo, email, telephone, mot_de_passe, 
        role_id, cip, parent_id, est_actif
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)
    `;
    
    await db.execute(sql, [
      nom, prenoms, age, pseudo, email, telephone, hashedPassword, 
      actualRoleId, cip, actualParentId
    ]);

    res.status(201).json({ 
      message: "Utilisateur inscrit avec succès !",
      parent_id: actualParentId,
      role_id: actualRoleId
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    return res.status(500).json({ 
      msg: "Erreur serveur",
      error: error.message 
    });
  }
});

router.post("/api/g/users", async (req, res) => {
  const { 
    nom, prenoms, age, pseudo, email, telephone, 
    mot_de_passe, conf_mot_de_passe, role_id, cip, 
    parent_id, invitation_token 
  } = req.body;

  try {
    let actualParentId = parent_id;
    let actualRoleId = role_id;
    let userRoleId;

    if (invitation_token) {
      const tokenQuery = `SELECT * FROM invitation_tokens 
        WHERE token = ? AND expires_at > NOW()`;

      const [tokenResults] = await db.execute(tokenQuery, [invitation_token]);

      if (tokenResults.length === 0) {
        return res.status(400).json({ 
          msg: "Token d'invitation invalide ou expiré" 
        });
      }

      const check_par_query = `SELECT COUNT(*) AS nb_enfants FROM utilisateurs WHERE parent_id = ?`;
      const [enfantsResult] = await db.execute(check_par_query, [tokenResults[0].parent_id]);
      if (enfantsResult[0].nb_enfants >= 100) {
        return res.status(400).json({ 
          msg: "Ce Grossiste a déjà 100 revendeurs, impossible d'en ajouter plus." 
        });
      }

      const tokenData = tokenResults[0];
      actualParentId = tokenData.parent_id;
      actualRoleId = tokenData.role_id;

      await db.execute(
        `UPDATE invitation_tokens SET used = used + 1 WHERE token = ?`, 
        [invitation_token]
      );

    } else {
      const authResult = await verifyToken(req);
      if (!authResult.success) {
        return res.status(403).json({ msg: authResult.message });
      }
      
      userRoleId = authResult.roleId;
      
      if (!userRoleId) {
        return res.status(403).json({ 
          msg: "Utilisateur non authentifié ou rôle non défini" 
        });
      }

      const ROLE_PASSWORDS = {
        1: "admin_secret",
        2: "crp_secret", 
        3: "gros_secret",
      };

      if ((userRoleId === 2 && role_id !== 3) || 
          (userRoleId === 3 && role_id !== 4)) {
        return res.status(403).json({ 
          msg: "Vous n'êtes pas autorisé à créer ce type d'utilisateur" 
        });
      }

      if (userRoleId !== 1 && userRoleId !== 2 && userRoleId !== 3) {
        return res.status(403).json({ 
          msg: "Vous n'êtes pas autorisé à créer des utilisateurs" 
        });
      }

      const { pass_id } = req.body;
      if (ROLE_PASSWORDS[role_id] && pass_id !== ROLE_PASSWORDS[role_id]) {
        return res.status(403).json({ 
          msg: "Mot de passe de confirmation incorrect" 
        });
      }

      actualParentId = parent_id || authResult.userId;
    }

    if (!nom || !prenoms || !age || !pseudo || !email || !telephone || 
        !mot_de_passe || !conf_mot_de_passe) {
      return res.status(400).json({ 
        msg: "Tous les champs sont requis" 
      });
    }

    if (actualRoleId < 1 || actualRoleId > 4) {
      return res.status(400).json({ 
        msg: "Le role_id doit avoir une valeur comprise entre 1 et 4" 
      });
    }

    if (mot_de_passe !== conf_mot_de_passe) {
      return res.status(400).json({ 
        msg: "Les mots de passe ne correspondent pas" 
      });
    }

    const existingUserQuery = `
      SELECT * FROM utilisateurs 
      WHERE pseudo = ? OR email = ? OR telephone = ?
    `;
    const [results] = await db.execute(existingUserQuery, [pseudo, email, telephone]);
    
    if (results.length > 0) {
      return res.status(400).json({ 
        msg: "Un utilisateur avec ce pseudo, email ou téléphone existe déjà" 
      });
    }

    const hashedPassword = await bcrypt.hash(mot_de_passe, 12);
    
    // Insertion
    const sql = `
      INSERT INTO utilisateurs (
        nom, prenoms, age, pseudo, email, telephone, mot_de_passe, 
        role_id, cip, parent_id, est_actif
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)
    `;
    
    await db.execute(sql, [
      nom, prenoms, age, pseudo, email, telephone, hashedPassword, 
      actualRoleId, cip, actualParentId
    ]);

    res.status(201).json({ 
      message: "Utilisateur inscrit avec succès !",
      parent_id: actualParentId,
      role_id: actualRoleId
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    return res.status(500).json({ 
      msg: "Erreur serveur",
      error: error.message 
    });
  }
});

// Route d'inscription modifiée pour accepter les tokens
router.post("/api/users", async (req, res) => {
  const { 
    nom, prenoms, age, pseudo, email, telephone, 
    mot_de_passe, conf_mot_de_passe, role_id, cip, 
    parent_id, invitation_token 
  } = req.body;

  try {
    let actualParentId = parent_id;
    let actualRoleId = role_id;
    let userRoleId;

    if (invitation_token) {
      const tokenQuery = `SELECT * FROM invitation_tokens 
        WHERE token = ? AND expires_at > NOW()`;

      const [tokenResults] = await db.execute(tokenQuery, [invitation_token]);

      if (tokenResults.length === 0) {
        return res.status(400).json({ 
          msg: "Token d'invitation invalide ou expiré" 
        });
      }

      const tokenData = tokenResults[0];
      actualParentId = tokenData.parent_id;
      actualRoleId = tokenData.role_id;

      await db.execute(
        `UPDATE invitation_tokens SET used = used + 1 WHERE token = ?`, 
        [invitation_token]
      );

    } else {
      const authResult = await verifyToken(req);
      if (!authResult.success) {
        return res.status(403).json({ msg: authResult.message });
      }
      
      userRoleId = authResult.roleId;
      
      if (!userRoleId) {
        return res.status(403).json({ 
          msg: "Utilisateur non authentifié ou rôle non défini" 
        });
      }

      const ROLE_PASSWORDS = {
        1: "admin_secret",
        2: "crp_secret", 
        3: "gros_secret",
      };

      if ((userRoleId === 2 && role_id !== 3) || 
          (userRoleId === 3 && role_id !== 4)) {
        return res.status(403).json({ 
          msg: "Vous n'êtes pas autorisé à créer ce type d'utilisateur" 
        });
      }

      if (userRoleId !== 1 && userRoleId !== 2 && userRoleId !== 3) {
        return res.status(403).json({ 
          msg: "Vous n'êtes pas autorisé à créer des utilisateurs" 
        });
      }

      const { pass_id } = req.body;
      if (ROLE_PASSWORDS[role_id] && pass_id !== ROLE_PASSWORDS[role_id]) {
        return res.status(403).json({ 
          msg: "Mot de passe de confirmation incorrect" 
        });
      }

      actualParentId = parent_id || authResult.userId;
    }

    if (!nom || !prenoms || !age || !pseudo || !email || !telephone || 
        !mot_de_passe || !conf_mot_de_passe) {
      return res.status(400).json({ 
        msg: "Tous les champs sont requis" 
      });
    }

    if (actualRoleId < 1 || actualRoleId > 4) {
      return res.status(400).json({ 
        msg: "Le role_id doit avoir une valeur comprise entre 1 et 4" 
      });
    }

    if (mot_de_passe !== conf_mot_de_passe) {
      return res.status(400).json({ 
        msg: "Les mots de passe ne correspondent pas" 
      });
    }

    const existingUserQuery = `
      SELECT * FROM utilisateurs 
      WHERE pseudo = ? OR email = ? OR telephone = ?
    `;
    const [results] = await db.execute(existingUserQuery, [pseudo, email, telephone]);
    
    if (results.length > 0) {
      return res.status(400).json({ 
        msg: "Un utilisateur avec ce pseudo, email ou téléphone existe déjà" 
      });
    }

    const hashedPassword = await bcrypt.hash(mot_de_passe, 12);
    
    // Insertion
    const sql = `
      INSERT INTO utilisateurs (
        nom, prenoms, age, pseudo, email, telephone, mot_de_passe, 
        role_id, cip, parent_id, est_actif
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)
    `;
    
    await db.execute(sql, [
      nom, prenoms, age, pseudo, email, telephone, hashedPassword, 
      actualRoleId, cip, actualParentId
    ]);

    res.status(201).json({ 
      message: "Utilisateur inscrit avec succès !",
      parent_id: actualParentId,
      role_id: actualRoleId
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    return res.status(500).json({ 
      msg: "Erreur serveur",
      error: error.message 
    });
  }
});

// Fonction helper pour vérifier le token (à adapter selon votre implémentation)
async function verifyToken(req) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return { success: false, message: "Token manquant" };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { 
      success: true, 
      userId: decoded.userId, 
      roleId: decoded.roleId 
    };
  } catch (error) {
    return { success: false, message: "Token invalide" };
  }
}

router.get("/api/verify-invitation/:token", async (req, res) => {
  try {
    const { token } = req.params;
    
    const tokenQuery = `
      SELECT t.*, u.nom, u.prenoms FROM invitation_tokens t
      JOIN utilisateurs u ON t.parent_id = u.id WHERE t.token = ? AND t.expires_at > NOW()`;
    
    const [results] = await db.execute(tokenQuery, [token]);
    
    if (results.length === 0) {
      return res.status(400).json({ 
        valid: false, 
        msg: "Token invalide ou expiré" 
      });
    }

    parenTokenQuery = `SELECT role_id FROM utilisateurs WHERE id = ?`;
    const [parentResults] = await db.execute(parenTokenQuery, [results[0].parent_id]);

    const tokenData = results[0];
    
    res.status(200).json({
      valid: true,
      role_id: tokenData.role_id,
      parent_name: `${tokenData.nom} ${tokenData.prenoms}`,
      parent_role_id: parentResults[0].role_id,
      expires_at: tokenData.expires_at
    });

  } catch (error) {
    res.status(500).json({ 
      valid: false, 
      msg: "Erreur serveur" 
    });
  }
});

// Route de connexion
router.post('/api/login', async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password)
    return res.status(400).json({ "msg": "Identifiant et mot de passe sont requis" });

  let query;
  if (!isNaN(identifier))
    query = 'SELECT * FROM utilisateurs WHERE id = ?';
  else if (identifier.includes('@'))
    query = 'SELECT * FROM utilisateurs WHERE email = ?';
  else
    query = 'SELECT * FROM utilisateurs WHERE pseudo = ?';

  try {
    const [results] = await db.execute(query, [identifier]);
    
    if (results.length === 0)
      return res.status(401).json({ "msg": "Identifiant ou mot de passe incorrect" });

    const user = results[0];
    
    // if (!user.est_actif)
    //   return res.status(201).json({ "msg": "Compte désactivé, veuillez contacter votre administrateur" });

    const isMatch = await bcrypt.compare(password, user.mot_de_passe);

    if (!isMatch)
      return res.status(401).json({ "msg": "Identifiant ou mot de passe incorrect" });

    const token = jwt.sign({ 
      userId: user.id,
      roleId: user.role_id
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, {
      httpOnly: true,
      httpOnly: true,
      secure: false,
      sameSite: 'none',
      maxAge: 1 * 60 * 60 * 1000
    });

    res.status(200).json({ 
      msg: "Connexion réussie",
      user: {
        id: user.id,
        nom: user.nom,
        prenoms: user.prenoms,
        role_id: user.role_id,
        email: user.email,
        pseudo: user.pseudo,
      },
      token: token
    });
  } catch (err) {
    return res.status(500).json({ "msg": "Erreur interne du serveur", error: err.message });
  }
});

router.get('/api/check-auth', (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({ authenticated: true, user: decoded });
  } catch (error) {
    res.status(401).json({ authenticated: false });
  }
});

// Route pour obtenir le profil de l'utilisateur connecté
router.get('/api/auth/me', async (req, res) => {
  let token = req.cookies.token;
  
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return res.status(401).json({ msg: 'Non authentifié' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Charger les infos utilisateur
    const [results] = await db.execute('SELECT * FROM utilisateurs WHERE id = ?', [userId]);
    
    if (results.length === 0) {
      return res.status(404).json({ msg: 'Utilisateur non trouvé' });
    }

    const user = results[0];
    // Ne pas renvoyer le mot de passe
    delete user.mot_de_passe;
    
    res.json({ user });

  } catch (err) {
    console.error('Erreur:', err);
    return res.status(401).json({ msg: 'Token invalide' });
  }
});

router.post('/api/auth/logout', (req, res) => {
  // Supprimer le cookie JWT
  res.clearCookie('token', {
    httpOnly: true,
    // secure: process.env.NODE_ENV === 'production', // S'assurer que le cookie n'est envoyé que sur HTTPS en production
    sameSite: 'Strict', // Assure que le cookie n'est pas envoyé avec des requêtes cross-site
    path: '/', // Le cookie sera supprimé pour toute l'application
  });

  return res.status(200).json({ message: 'Déconnexion réussie' });
});

module.exports = router;
