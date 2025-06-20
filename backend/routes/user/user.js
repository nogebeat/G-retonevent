const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../../config/db");
const veritoken = require("../../Middleware/auth");
const NotificationService = require("../notif/notif-query");
const sendMail = require("../../config/mail");
const crypto = require('crypto');
require("dotenv").config();
const router = express.Router();

// Route pour obtenir les utilisateurs selon la hiérarchie
router.get('/api/users', veritoken, async (req, res) => {
    const userRoleId = req.roleId;
    const userId = req.userId;
    
    let query;
    let params = [];
    
    if (userRoleId === 1)
      query = 'SELECT id, nom, prenoms, age, pseudo, email, telephone, role_id, photo_profil, cip, parent_id, est_actif, date_creation FROM utilisateurs';
    else if (userRoleId === 2) {
      query = 'SELECT id, nom, prenoms, age, pseudo, email, telephone, role_id, photo_profil, cip, parent_id, est_actif, date_creation FROM utilisateurs WHERE parent_id = ? AND role_id = 3';
      params = [userId];
    }
    else if (userRoleId === 3) {
      query = 'SELECT id, nom, prenoms, age, pseudo, email, telephone, role_id, photo_profil, cip, parent_id, est_actif, date_creation FROM utilisateurs WHERE parent_id = ? AND role_id = 4';
      params = [userId];
    }
    else
      return res.status(403).json({ "msg": "Vous n'avez pas accès à cette ressource" });
    
    try {
      const [rows] = await db.query(query, params);
      res.status(200).json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ "msg": "Erreur interne du serveur" });
    }
});

router.put("/api/users/:id/password", veritoken, async (req, res) => {
    const userIdToUpdate = parseInt(req.params.id);
    const { ancien_mot_de_passe, nouveau_mot_de_passe, conf_mot_de_passe } = req.body;
  
    if (req.userId !== userIdToUpdate) {
      return res.status(403).json({ msg: "Vous ne pouvez changer que votre propre mot de passe." });
    }
  
    if (!ancien_mot_de_passe || !nouveau_mot_de_passe || !conf_mot_de_passe) {
      return res.status(400).json({ msg: "Tous les champs sont requis." });
    }
  
    if (nouveau_mot_de_passe !== conf_mot_de_passe) {
      return res.status(400).json({ msg: "Les nouveaux mots de passe ne correspondent pas." });
    }
  
    try {
      const getUserQuery = "SELECT * FROM utilisateurs WHERE id = ?";
      const [results] = await db.query(getUserQuery, [userIdToUpdate]);
      
      if (results.length === 0) 
        return res.status(404).json({ msg: "Utilisateur introuvable." });
  
      const user = results[0];
  
      const match = await bcrypt.compare(ancien_mot_de_passe, user.mot_de_passe);
      if (!match) {
        return res.status(401).json({ msg: "Ancien mot de passe incorrect." });
      }
  
      const hashedPassword = await bcrypt.hash(nouveau_mot_de_passe, 10);
      const updateQuery = "UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?";
      await db.query(updateQuery, [hashedPassword, userIdToUpdate]);
      
      // Notification et email de changement de mot de passe
      const message = `Bonjour ${user.nom} ${user.prenoms},\n\nVotre mot de passe a été modifié avec succès le ${new Date().toLocaleString('fr-FR')}.\n\nSi ce n'était pas vous, contactez immédiatement l'administration.\n\nCordialement,\nL'équipe technique`;
      
      await NotificationService.creerNotification(
        userIdToUpdate,
        userIdToUpdate,
        'securite',
        'Mot de passe modifié',
        'Votre mot de passe a été modifié avec succès. Si ce n\'était pas vous, contactez immédiatement l\'administration.'
      );
      
      await sendMail(message, user.email, 'Modification de votre mot de passe');
      
      return res.status(200).json({ msg: "Mot de passe mis à jour avec succès." });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erreur interne du serveur", error: error.message });
    }
});

router.get("/api/users/check-actif", veritoken, async (req, res) => {
    const userId = req.userId;

    try {
      const [rows] = await db.query("SELECT est_actif FROM utilisateurs WHERE id = ?", [userId]);

      if (rows.length === 0) {
        return res.status(404).json({ message: "Utilisateur non trouvé." });
      }

      res.status(200).json({ est_actif: rows[0].est_actif });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur." });
    }
});

router.put("/api/users/change-actif", veritoken, async (req, res) => {
    const userId = req.userId;
    const { est_actif } = req.body;

    if (typeof est_actif !== "boolean") {
      return res.status(400).json({ message: "Le champ 'est_actif' doit être un booléen." });
    }

    try {
      const [userRows] = await db.query("SELECT nom, prenoms, email FROM utilisateurs WHERE id = ?", [userId]);
      
      if (userRows.length === 0) {
        return res.status(404).json({ message: "Utilisateur non trouvé." });
      }
      
      const user = userRows[0];

      const [result] = await db.query("UPDATE utilisateurs SET est_actif = ? WHERE id = ?", [est_actif, userId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Utilisateur non trouvé." });
      }

      // Notification et email de changement de statut
      const statutMessage = est_actif ? 'activé' : 'désactivé';
      const emailMessage = `Bonjour ${user.nom} ${user.prenoms},\n\nVotre compte a été ${statutMessage} le ${new Date().toLocaleString('fr-FR')}.\n\n${est_actif ? 'Vous pouvez maintenant accéder à toutes les fonctionnalités de l\'application.' : 'Si vous avez des questions, contactez votre administrateur.'}\n\nCordialement,\nL'équipe technique`;
      
      await NotificationService.creerNotification(
        userId,
        userId,
        'statut',
        'Statut de compte modifié',
        `Votre compte a été ${statutMessage}.`
      );
      
      await sendMail(emailMessage, user.email, `Compte ${statutMessage}`);

      res.status(200).json({ message: "Statut mis à jour avec succès." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur." });
    }
});

router.put("/api/users/change-actif/:id", veritoken, async (req, res) => {
  const { id } = req.params;
  const { est_actif } = req.body;
  const adminId = req.userId;

  if (typeof est_actif !== "boolean") {
    return res.status(400).json({ message: "Le champ 'est_actif' doit être un booléen." });
  }

  try {
    const [rows] = await db.query("SELECT role_id, parent_id, nom, prenoms, email FROM utilisateurs WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const user = rows[0];
    
    // Récupérer les infos de l'admin
    const [adminRows] = await db.query("SELECT nom, prenoms FROM utilisateurs WHERE id = ?", [adminId]);
    const admin = adminRows[0];

    const [updateUser] = await db.query(
      "UPDATE utilisateurs SET est_actif = ? WHERE id = ?",
      [est_actif, id]
    );

    // Notification et email à l'utilisateur concerné
    const statutMessage = est_actif ? 'activé' : 'désactivé';
    const emailMessage = `Bonjour ${user.nom} ${user.prenoms},\n\nVotre compte a été ${statutMessage} par ${admin.nom} ${admin.prenoms} le ${new Date().toLocaleString('fr-FR')}.\n\n${est_actif ? 'Vous pouvez maintenant accéder à toutes les fonctionnalités de l\'application.' : 'Pour toute question, contactez votre administrateur.'}\n\nCordialement,\nL'équipe technique`;
    
    await NotificationService.creerNotification(
      adminId,
      id,
      'statut',
      'Statut de compte modifié',
      `Votre compte a été ${statutMessage} par un administrateur.`
    );
    
    await sendMail(emailMessage, user.email, `Compte ${statutMessage} par l'administration`);

    // Si désactivation d'un détaillant, désactiver aussi ses enfants
    if (!est_actif && user.role_id === 3 && [1, 2].includes(user.parent_id)) {
      await db.query(
        "UPDATE utilisateurs SET est_actif = ? WHERE parent_id = ? AND role_id = 4",
        [est_actif, id]
      );

      // Notifier et envoyer email à tous les enfants désactivés
      const [enfants] = await db.query("SELECT id, nom, prenoms, email FROM utilisateurs WHERE parent_id = ? AND role_id = 4", [id]);
      for (const enfant of enfants) {
        const enfantEmailMessage = `Bonjour ${enfant.nom} ${enfant.prenoms},\n\nVotre compte a été désactivé suite à la désactivation de votre parent ${user.nom} ${user.prenoms} le ${new Date().toLocaleString('fr-FR')}.\n\nPour toute question, contactez votre administrateur.\n\nCordialement,\nL'équipe technique`;
        
        await NotificationService.creerNotification(
          adminId,
          enfant.id,
          'statut',
          'Compte désactivé',
          `Votre compte a été désactivé suite à la désactivation de votre parent ${user.nom} ${user.prenoms}.`
        );
        
        await sendMail(enfantEmailMessage, enfant.email, 'Compte désactivé - Désactivation du parent');
      }
    }

    res.status(200).json({ message: `Statut de l'utilisateur ${id} mis à jour avec succès.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

router.put("/api/users/change-statut/:id", veritoken, async (req, res) => {
  const { id } = req.params;
  const { statut } = req.body;
  const userRoleId = req.roleId;
  const adminId = req.userId;

  if (userRoleId !== 2) {
    return res.status(403).json({ 
      message: "Seuls les Super-Grossiste peuvent modifier le statut des utilisateurs."
    });
  }

  const statutsValides = ['non_assigné', 'RP-Ancien', 'RP-Nouveau', 'Partenaire'];
  if (!statut || !statutsValides.includes(statut)) {
    return res.status(400).json({ 
      message: "Le statut doit être l'un des suivants : non_assigné, RP-Ancien, RP-Nouveau, Partenaire" 
    });
  }

  try {
    const [rows] = await db.query(
      "SELECT id, role_id, parent_id, statut, nom, prenoms, email FROM utilisateurs WHERE id = ?", 
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const utilisateur = rows[0];
    
    // Récupérer les infos du Super-Grossiste
    const [adminRows] = await db.query("SELECT nom, prenoms FROM utilisateurs WHERE id = ?", [adminId]);
    const admin = adminRows[0];
    
    if (utilisateur.role_id === 3) {
      if (utilisateur.parent_id !== req.userId) {
        return res.status(403).json({ 
          message: "Vous ne pouvez modifier le statut que des utilisateurs sous votre hiérarchie." 
        });
      }
    } else if (utilisateur.role_id === 4) {
      const [detaillantRows] = await db.query(
        "SELECT parent_id FROM utilisateurs WHERE id = ?", 
        [utilisateur.parent_id]
      );
      
      if (detaillantRows.length === 0 || detaillantRows[0].parent_id !== req.userId) {
        return res.status(403).json({ 
          message: "Vous ne pouvez modifier le statut que des utilisateurs sous votre hiérarchie." 
        });
      }
    } else {
      return res.status(403).json({ 
        message: "Vous ne pouvez pas modifier le statut de cet utilisateur." 
      });
    }

    const [result] = await db.query(
      "UPDATE utilisateurs SET statut = ? WHERE id = ?",
      [statut, id]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ message: "Erreur lors de la mise à jour du statut." });
    }

    // Notification et email de changement de statut
    const emailMessage = `Bonjour ${utilisateur.nom} ${utilisateur.prenoms},\n\nVotre statut professionnel a été modifié par ${admin.nom} ${admin.prenoms} le ${new Date().toLocaleString('fr-FR')}.\n\nAncien statut : ${utilisateur.statut}\nNouveau statut : ${statut}\n\nCette modification peut impacter vos privilèges et fonctionnalités disponibles.\n\nCordialement,\nVotre Super-Grossiste`;
    
    await NotificationService.creerNotification(
      adminId,
      id,
      'statut',
      'Statut professionnel modifié',
      `Votre statut a été modifié de "${utilisateur.statut}" vers "${statut}" par votre Super-Grossiste.`,
      {
        ancien_statut: utilisateur.statut,
        nouveau_statut: statut
      }
    );
    
    await sendMail(emailMessage, utilisateur.email, 'Modification de votre statut professionnel');

    res.status(200).json({ 
      message: `Statut de l'utilisateur ${id} mis à jour avec succès.`,
      ancien_statut: utilisateur.statut,
      nouveau_statut: statut
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
});

router.get("/api/users/statut/:id", veritoken, async (req, res) => {
  const { id } = req.params;
  const userRoleId = req.roleId;
  const userId = req.userId;

  try {
    let query;
    let params = [];

    if (userRoleId === 1) {
      query = "SELECT id, nom, prenoms, pseudo, statut FROM utilisateurs WHERE id = ?";
      params = [id];
    } else if (userRoleId === 2) {
      query = `
        SELECT u.id, u.nom, u.prenoms, u.pseudo, u.statut 
        FROM utilisateurs u 
        WHERE u.id = ? AND (
          (u.role_id = 3 AND u.parent_id = ?) OR 
          (u.role_id = 4 AND u.parent_id IN (
            SELECT id FROM utilisateurs WHERE parent_id = ? AND role_id = 3
          ))
        )
      `;
      params = [id, userId, userId];
    } else if (userRoleId === 3) {
      query = `
        SELECT id, nom, prenoms, pseudo, statut 
        FROM utilisateurs 
        WHERE id = ? AND (id = ? OR (role_id = 4 AND parent_id = ?))
      `;
      params = [id, userId, userId];
    } else {
      if (parseInt(id) !== userId) {
        return res.status(403).json({ 
          message: "Vous ne pouvez consulter que votre propre statut." 
        });
      }
      query = "SELECT id, nom, prenoms, pseudo, statut FROM utilisateurs WHERE id = ?";
      params = [id];
    }

    const [rows] = await db.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ 
        message: "Utilisateur non trouvé ou vous n'avez pas accès à cette information." 
      });
    }

    res.status(200).json(rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur.", error: err.message });
  }
});

router.get('/api/users/grossiste/:grossisteId/revendeurs', veritoken, async (req, res) => {
    const { grossisteId } = req.params;
    const userRoleId = req.roleId;
    const userId = req.userId;
    
    if (userRoleId !== 2) {
        return res.status(403).json({ 
            message: "Seuls les Super-Grossistes (CRP) peuvent accéder à cette ressource" 
        });
    }
    
    try {
        const [grossisteCheck] = await db.query(
            'SELECT id, nom, prenoms FROM utilisateurs WHERE id = ? AND parent_id = ? AND role_id = 3',
            [grossisteId, userId]
        );
        
        if (grossisteCheck.length === 0) {
            return res.status(404).json({ 
                message: "Grossiste non trouvé ou vous n'avez pas accès à ce grossiste" 
            });
        }
        const query = `SELECT  id, nom, prenoms, pseudo, telephone, photo_profil, est_actif, nb_vip, nb_vip_ven, nb_vip_reçu, nb_tickets, nb_tickets_ven, nb_tickets_reçu
            FROM utilisateurs WHERE parent_id = ? AND role_id = 4 ORDER BY nom, prenoms`;
        
        const [revendeurs] = await db.query(query, [grossisteId]);
        const revendeursFormattes = revendeurs.map(revendeur => ({
            ...revendeur,
            photo_profil: (!revendeur.photo_profil || revendeur.photo_profil === 'NULL') 
                ? '/bg.jpg' 
                : revendeur.photo_profil
        }));
        
        res.status(200).json({
            grossiste: grossisteCheck[0],
            revendeurs: revendeursFormattes,
            total: revendeursFormattes.length
        });
        
    } catch (err) {
        console.error('Erreur lors de la récupération des revendeurs du grossiste:', err);
        res.status(500).json({ 
            message: "Erreur interne du serveur",
            error: err.message 
        });
    }
});

router.get('/api/users/revendeurs-by-grossiste/:grossisteId', veritoken, async (req, res) => {
    const { grossisteId } = req.params;
    const userRoleId = req.roleId;
    const userId = req.userId;
    
    if (userRoleId !== 2) {
        return res.status(403).json({ 
            message: "Seuls les Super-Grossistes (CRP) peuvent accéder à cette ressource" 
        });
    }
    
    try {
        const [grossisteCheck] = await db.query(
            'SELECT id FROM utilisateurs WHERE id = ? AND parent_id = ? AND role_id = 3',
            [grossisteId, userId]
        );
        
        if (grossisteCheck.length === 0) {
            return res.status(404).json({ 
                message: "Grossiste non trouvé ou vous n'avez pas accès à ce grossiste" 
            });
        }
        
        const query = `
            SELECT id,nom, prenoms, age, pseudo, telephone, photo_profil,est_actif, nb_vip,nb_vip_ven,nb_vip_reçu,nb_tickets,nb_tickets_ven,nb_tickets_reçu
            FROM utilisateurs 
            WHERE parent_id = ? AND role_id = 4
            ORDER BY nom, prenoms`;
        
        const [revendeurs] = await db.query(query, [grossisteId]);
        const revendeursFormattes = revendeurs.map(revendeur => ({
            ...revendeur,
            photo_profil: (!revendeur.photo_profil || revendeur.photo_profil === 'NULL') 
                ? '/bg.jpg' 
                : revendeur.photo_profil
        }));
        
        res.status(200).json(revendeursFormattes);
        
    } catch (err) {
        console.error('Erreur lors de la récupération des revendeurs:', err);
        res.status(500).json({ 
            message: "Erreur interne du serveur",
            error: err.message 
        });
    }
});


router.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ 
        msg: "L'adresse email est requise" 
      });
    }

    const userQuery = `SELECT id, nom, prenoms, email FROM utilisateurs WHERE email = ?`;
    const [userResults] = await db.execute(userQuery, [email]);

    if (userResults.length === 0) {
      return res.status(200).json({ 
        msg: "Si cette adresse email existe dans notre système, vous recevrez un lien de réinitialisation" 
      });
    }

    const user = userResults[0];

    const resetToken = crypto.randomBytes(32).toString('hex');
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 3);

    const insertTokenQuery = `
      INSERT INTO password_reset_tokens (user_id, token, expires_at) 
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      token = VALUES(token), 
      expires_at = VALUES(expires_at), 
      used = FALSE
    `;
    
    await db.execute(insertTokenQuery, [user.id, resetToken, expiresAt]);

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    const emailSubject = "Réinitialisation de votre mot de passe - FestiChill";
    const emailMessage = `
Bonjour ${user.prenoms} ${user.nom},

Vous avez demandé la réinitialisation de votre mot de passe pour votre compte FestiChill.

Cliquez sur le lien suivant pour réinitialiser votre mot de passe :
${resetLink}

Ce lien est valable pendant 1 heure seulement.

Si vous n'avez pas demandé cette réinitialisation, ignorez ce message.

Cordialement,
L'équipe FestiChill
    `;

    // Envoyer l'email
    await sendMail(emailMessage, user.email, emailSubject);

    res.status(200).json({ 
      msg: "Si cette adresse email existe dans notre système, vous recevrez un lien de réinitialisation" 
    });

  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation:', error);
    res.status(500).json({ 
      msg: "Erreur serveur lors de la demande de réinitialisation",
      error: error.message 
    });
  }
});

router.get("/api/verify-reset-token/:token", async (req, res) => {
  try {
    const { token } = req.params;
    
    const now = new Date();
    const query = `
      SELECT prt.*, u.nom, u.prenoms, u.email 
      FROM password_reset_tokens prt
      JOIN utilisateurs u ON prt.user_id = u.id 
      WHERE prt.token = ? 
        AND prt.expires_at > ? 
        AND prt.used = FALSE
    `;

    const [results] = await db.execute(query, [token, now]);

    
    // const [results] = await db.execute(tokenQuery, [token]);
    // console.log(results);
    
    if (results.length === 0) {
      return res.status(400).json({ 
        valid: false, 
        msg: "Token invalide, expiré ou déjà utilisé" 
      });
    }

    const tokenData = results[0];
    
    res.status(200).json({
      valid: true,
      user: {
        nom: tokenData.nom,
        prenoms: tokenData.prenoms,
        email: tokenData.email
      },
      expires_at: tokenData.expires_at
    });

  } catch (error) {
    console.error('Erreur lors de la vérification du token:', error);
    res.status(500).json({ 
      valid: false, 
      msg: "Erreur serveur lors de la vérification" 
    });
  }
});

router.post("/api/reset-password", async (req, res) => {
  const { token, nouveau_mot_de_passe, conf_nouveau_mot_de_passe } = req.body;

  try {
    if (!token || !nouveau_mot_de_passe || !conf_nouveau_mot_de_passe) {
      return res.status(400).json({ 
        msg: "Tous les champs sont requis" 
      });
    }

    if (nouveau_mot_de_passe !== conf_nouveau_mot_de_passe) {
      return res.status(400).json({ 
        msg: "Les mots de passe ne correspondent pas" 
      });
    }

    if (nouveau_mot_de_passe.length < 6) {
      return res.status(400).json({ 
        msg: "Le mot de passe doit contenir au moins 6 caractères" 
      });
    }

    const now = new Date();

    const tokenQuery = `
      SELECT prt.*, u.email 
      FROM password_reset_tokens prt
      JOIN utilisateurs u ON prt.user_id = u.id 
      WHERE prt.token = ? AND prt.expires_at > ? AND prt.used = FALSE
    `;
    
    const [tokenResults] = await db.execute(tokenQuery, [token, now]);
    
    if (tokenResults.length === 0) {
      return res.status(400).json({ 
        msg: "Token invalide, expiré ou déjà utilisé" 
      });
    }

    const tokenData = tokenResults[0];

    const hashedPassword = await bcrypt.hash(nouveau_mot_de_passe, 12);

    const updatePasswordQuery = `
      UPDATE utilisateurs 
      SET mot_de_passe = ? 
      WHERE id = ?
    `;
    
    await db.execute(updatePasswordQuery, [hashedPassword, tokenData.user_id]);

    const markTokenUsedQuery = `
      UPDATE password_reset_tokens 
      SET used = TRUE 
      WHERE token = ?
    `;
    
    await db.execute(markTokenUsedQuery, [token]);

    const confirmationSubject = "Mot de passe réinitialisé avec succès - FestiChill";
    const confirmationMessage = `
Bonjour,

Votre mot de passe a été réinitialisé avec succès.

Si vous n'êtes pas à l'origine de cette action, contactez immédiatement notre support.

Cordialement,
L'équipe FestiChill
    `;

    try {
      await sendMail(confirmationMessage, tokenData.email, confirmationSubject);
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email de confirmation:', emailError);
    }

    res.status(200).json({ 
      msg: "Mot de passe réinitialisé avec succès" 
    });

  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ 
      msg: "Erreur serveur lors de la réinitialisation",
      error: error.message 
    });
  }
});

router.delete("/api/cleanup-expired-tokens", async (req, res) => {
  try {
    const deleteExpiredQuery = `
      DELETE FROM password_reset_tokens 
      WHERE expires_at < NOW() OR used = TRUE
    `;
    
    const [result] = await db.execute(deleteExpiredQuery);
    
    res.status(200).json({ 
      msg: `${result.affectedRows} tokens expirés supprimés` 
    });

  } catch (error) {
    console.error('Erreur lors du nettoyage des tokens:', error);
    res.status(500).json({ 
      msg: "Erreur serveur lors du nettoyage" 
    });
  }
});

module.exports = router;
