const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../../config/db");
const veritoken = require("../../Middleware/auth");
const NotificationService = require("../notif/notif-query");
require("dotenv").config();
const router = express.Router();
const upload = require('../../Middleware/upload');
const uploadToDrive = require('../../config/drive');

// Route pour activer un utilisateur
router.put('/api/users/activate/:userId', veritoken, async (req, res) => {
    const targetUserId = req.params.userId;
    const activatorId = req.userId;
    const activatorRoleId = req.roleId;
    
    try {
      const [results] = await db.query('SELECT * FROM utilisateurs WHERE id = ?', [targetUserId]);
      
      if (results.length === 0) 
        return res.status(404).json({ "msg": "Utilisateur non trouvé" });
      
      const targetUser = results[0];
      
      if ((activatorRoleId === 2 && targetUser.role_id === 3) || 
          (activatorRoleId === 3 && targetUser.role_id === 4) ||
          (activatorRoleId === 1)) {
        
        await db.query('UPDATE utilisateurs SET est_actif = TRUE WHERE id = ?', [targetUserId]);
        
        // Créer notification et envoyer email
        await NotificationService.creerNotification(
          activatorId,
          targetUserId,
          'activation_compte',
          'Compte activé',
          'Votre compte a été activé avec succès. Vous pouvez maintenant accéder à toutes les fonctionnalités de l\'application.'
        );
        
        res.status(200).json({ "msg": "Utilisateur activé avec succès" });
      } else {
        return res.status(403).json({ "msg": "Vous n'êtes pas autorisé à activer cet utilisateur" });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ "msg": "Erreur interne du serveur" });
    }
});
  
// Route pour désactiver un utilisateur
router.put('/api/users/desactivate/:userId', veritoken, async (req, res) => {
    const targetUserId = req.params.userId;
    const deactivatorId = req.userId;
    const deactivatorRoleId = req.roleId;
    
    try {
      const [results] = await db.query('SELECT * FROM utilisateurs WHERE id = ?', [targetUserId]);
      
      if (results.length === 0) 
        return res.status(404).json({ "msg": "Utilisateur non trouvé" });
      
      const targetUser = results[0];
      
      if ((deactivatorRoleId === 2 && targetUser.role_id === 3) || 
          (deactivatorRoleId === 3 && targetUser.role_id === 4) ||
          (deactivatorRoleId === 1)) {
        
        await db.query('UPDATE utilisateurs SET est_actif = FALSE WHERE id = ?', [targetUserId]);
        
        // Créer notification et envoyer email
        await NotificationService.creerNotification(
          deactivatorId,
          targetUserId,
          'desactivation_compte',
          'Compte désactivé',
          'Votre compte a été temporairement désactivé. Veuillez contacter votre administrateur pour plus d\'informations.'
        );
        
        res.status(200).json({ "msg": "Utilisateur désactivé avec succès" });
      } else {
        return res.status(403).json({ "msg": "Vous n'êtes pas autorisé à désactiver cet utilisateur" });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ "msg": "Erreur interne du serveur" });
    }
});

// Route pour récupérer les informations d'un utilisateur (pas de notification nécessaire)
router.get('/api/users/:id', veritoken, async (req, res) => {
    const targetUserId = req.params.id;
    const requesterId = req.userId;
    const requesterRoleId = req.roleId;
  
    try {
      const [results] = await db.query('SELECT * FROM utilisateurs WHERE id = ?', [targetUserId]);
      
      if (results.length === 0)
        return res.status(404).json({ "msg": "Utilisateur non trouvé" });
      
      const [results2] = await db.query('SELECT * FROM utilisateurs WHERE id = ?', [requesterId]);
      
      if (results2.length === 0)
        return res.status(404).json({ "msg": "Utilisateur non trouvé" });
      
      const requesterUser = results2[0];
      const targetUser = results[0];
  
      if (requesterRoleId === 1 ||
          requesterId === parseInt(targetUserId) ||
          (requesterRoleId === 2 && targetUser.role_id === 3 && targetUser.parent_id === requesterId) ||
          (requesterRoleId === 3 && targetUser.role_id === 4 && targetUser.parent_id === requesterId)) {
        
        const userData = {
          id: targetUser.id,
          nom: targetUser.nom,
          prenoms: targetUser.prenoms,
          age: targetUser.age,
          pseudo: targetUser.pseudo,
          email: targetUser.email,
          telephone: targetUser.telephone,
          role_id: targetUser.role_id,
          photo_profil: targetUser.photo_profil,
          cip: targetUser.cip,
          parent_id: targetUser.parent_id,
          est_actif: targetUser.est_actif,
          date_creation: targetUser.date_creation,
          statut: targetUser.statut
        };
  
        return res.status(200).json(userData);
      } else if (requesterUser.parent_id === parseInt(targetUserId)) {
        const userData = {
          id: targetUser.id,
          nom: targetUser.nom,
          prenoms: targetUser.prenoms,
          telephone: targetUser.telephone,
        };
        return res.status(200).json(userData);
      } else {
        return res.status(403).json({ "msg": "Vous n'êtes pas autorisé à accéder aux détails de cet utilisateur" });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ "msg": "Erreur interne du serveur" });
    }
});

// Route pour mettre à jour la photo de profil
router.put('/api/users/:id/photo', veritoken, upload.single('photo_profil'), async (req, res) => {
  const targetUserId = req.params.id;
  const requesterId = req.userId;
  const requesterRoleId = req.roleId;
  const photo_profil = await uploadToDrive(req.file);

  try {
    const [results] = await db.query('SELECT * FROM utilisateurs WHERE id = ?', [targetUserId]);
      
      if (results.length === 0)
        return res.status(404).json({ "msg": "Utilisateur non trouvé" });
  
      const targetUser = results[0];
  
      if (requesterRoleId === 1 ||
          requesterId === parseInt(targetUserId) ||
          (requesterRoleId === 2 && targetUser.role_id === 3 && targetUser.parent_id === requesterId) ||
          (requesterRoleId === 3 && targetUser.role_id === 4 && targetUser.parent_id === requesterId)) {
        
        let updateData = {};
        let updateFields = [];
        let updateValues = [];
  
        if (photo_profil) {
          updateFields.push('photo_profil = ?');
          updateValues.push(photo_profil);
          updateData.photo_profil = photo_profil;
        }
  
        if (updateFields.length === 0)
          return res.status(400).json({ "msg": "Aucune information à mettre à jour"});
  
        const updateQuery = `UPDATE utilisateurs SET ${updateFields.join(', ')} WHERE id = ?`;
        updateValues.push(targetUserId);
  
        await db.query(updateQuery, updateValues);
        
        // Notification pour mise à jour de photo de profil
        if (requesterId !== parseInt(targetUserId)) {
          // Si c'est un parent qui modifie la photo de son enfant
          await NotificationService.creerNotification(
            requesterId,
            targetUserId,
            'mise_a_jour_profil',
            'Photo de profil mise à jour',
            'Votre photo de profil a été mise à jour par votre administrateur.'
          );
        }
        
        res.status(200).json({ 
          "msg": "Utilisateur mis à jour avec succès",
          "updated": updateData,
          message: 'Photo uploadée sur Drive', url: photo_profil
        });
      } else {
        return res.status(403).json({ "msg": "Vous n'êtes pas autorisé à modifier cet utilisateur" });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ "msg": "Erreur lors de la mise à jour", error: err.message });
    }
});

// Route pour mettre à jour les informations utilisateur
router.put('/api/users/:id', veritoken, async (req, res) => {
    const targetUserId = req.params.id;
    const requesterId = req.userId;
    const requesterRoleId = req.roleId;
    const { nom, prenoms, age, pseudo, email, telephone, mot_de_passe, conf_mot_de_passe, cip , photo_profil} = req.body;

    // console.log(req.body);
    try {

      const [results] = await db.query('SELECT * FROM utilisateurs WHERE id = ?', [targetUserId]);
      
      if (results.length === 0)
        return res.status(404).json({ "msg": "Utilisateur non trouvé" });
  
      const targetUser = results[0];
  
      if (requesterRoleId === 1 ||
          requesterId === parseInt(targetUserId) ||
          (requesterRoleId === 2 && targetUser.role_id === 3 && targetUser.parent_id === requesterId) ||
          (requesterRoleId === 3 && targetUser.role_id === 4 && targetUser.parent_id === requesterId)) {
        
        let updateData = {};
        let updateFields = [];
        let updateValues = [];
        let changementsImportants = [];
  
        if (nom && nom !== targetUser.nom) {
            updateFields.push('nom = ?'); 
            updateValues.push(nom); 
            updateData.nom = nom;
            changementsImportants.push(`Nom: ${targetUser.nom} → ${nom}`);
        }
        if (prenoms && prenoms !== targetUser.prenoms) {
            updateFields.push('prenoms = ?'); 
            updateValues.push(prenoms); 
            updateData.prenoms = prenoms;
            changementsImportants.push(`Prénoms: ${targetUser.prenoms} → ${prenoms}`);
        }
        if (age && age !== targetUser.age) {
            updateFields.push('age = ?'); 
            updateValues.push(age); 
            updateData.age = age;
            changementsImportants.push(`Âge: ${targetUser.age} → ${age}`);
        }
        
        if (pseudo && pseudo !== targetUser.pseudo) {
          const [pseudoResults] = await db.query('SELECT id FROM utilisateurs WHERE pseudo = ? AND id != ?', [pseudo, targetUserId]);
          
          if (pseudoResults.length > 0) 
            return res.status(400).json({ "msg": "Ce pseudo est déjà utilisé" });
            
          updateFields.push('pseudo = ?'); 
          updateValues.push(pseudo); 
          updateData.pseudo = pseudo;
          changementsImportants.push(`Pseudo: ${targetUser.pseudo} → ${pseudo}`);
        }
        
        if (email && email !== targetUser.email) {
          const [emailResults] = await db.query('SELECT id FROM utilisateurs WHERE email = ? AND id != ?', [email, targetUserId]);
          
          if (emailResults.length > 0) 
            return res.status(400).json({ "msg": "Cet email est déjà utilisé" });
            
          updateFields.push('email = ?'); 
          updateValues.push(email); 
          updateData.email = email;
          changementsImportants.push(`Email: ${targetUser.email} → ${email}`);
        }
  
        if (telephone && telephone !== targetUser.telephone) {
          const [telephoneResults] = await db.query('SELECT id FROM utilisateurs WHERE telephone = ? AND id != ?', [telephone, targetUserId]);
          
          if (telephoneResults.length > 0) 
            return res.status(400).json({ "msg": "Ce numéro de téléphone est déjà utilisé" });
            
          updateFields.push('telephone = ?'); 
          updateValues.push(telephone); 
          updateData.telephone = telephone;
          changementsImportants.push(`Téléphone: ${targetUser.telephone} → ${telephone}`);
        }
  
        if (photo_profil && photo_profil !== targetUser.photo_profil) { 
          updateFields.push('photo_profil = ?'); 
          updateValues.push(photo_profil); 
          updateData.photo_profil = photo_profil;
          changementsImportants.push('Photo de profil mise à jour');
        }        
        if (cip && cip !== targetUser.cip) { 
          updateFields.push('cip = ?'); 
          updateValues.push(cip); 
          updateData.cip = cip;
          changementsImportants.push(`CIP: ${targetUser.cip} → ${cip}`);
        }
  
        if (mot_de_passe) {
          if (!conf_mot_de_passe)
            return res.status(400).json({ "msg": "La confirmation du mot de passe est requise" });
          
          if (mot_de_passe !== conf_mot_de_passe)
            return res.status(400).json({ "msg": "Les mots de passe ne correspondent pas" });
          
          const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
          updateFields.push('mot_de_passe = ?');
          updateValues.push(hashedPassword);
          changementsImportants.push('Mot de passe modifié');
        }
  
        if (updateFields.length === 0)
          return res.status(400).json({ "msg": "Aucune information à mettre à jour"});
  
        const updateQuery = `UPDATE utilisateurs SET ${updateFields.join(', ')} WHERE id = ?`;
        updateValues.push(targetUserId);
  
        await db.query(updateQuery, updateValues);
        
        // Créer notification si des changements importants ont été effectués
        if (changementsImportants.length > 0) {
          const message = requesterId === parseInt(targetUserId) 
            ? `Vous avez mis à jour votre profil. Modifications: ${changementsImportants.join(', ')}`
            : `Votre profil a été mis à jour par votre administrateur. Modifications: ${changementsImportants.join(', ')}`;
          
          await NotificationService.creerNotification(
            requesterId,
            targetUserId,
            'mise_a_jour_profil',
            'Profil mis à jour',
            message,
            { modifications: changementsImportants }
          );
        }
        
        res.status(200).json({ 
          "msg": "Utilisateur mis à jour avec succès",
        });
      } else {
        return res.status(403).json({ "msg": "Vous n'êtes pas autorisé à modifier cet utilisateur" });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ "msg": "Erreur lors de la mise à jour", error: err.message });
    }
});

// Route pour supprimer un utilisateur
router.delete('/api/users/:id', veritoken, async (req, res) => {
  const targetUserId = req.params.id;
  const requesterId = req.userId;
  const requesterRoleId = req.roleId;

  try {
    const [results] = await db.query('SELECT * FROM utilisateurs WHERE id = ?', [targetUserId]);

    if (results.length === 0)
      return res.status(404).json({ msg: "Utilisateur non trouvé" });

    const targetUser = results[0];

    // Vérification des permissions
    if (
      requesterRoleId === 1 ||
      (requesterRoleId === 2 && targetUser.role_id === 3 && targetUser.parent_id === requesterId) ||
      (requesterRoleId === 3 && targetUser.role_id === 4 && targetUser.parent_id === requesterId)
    ) {
      // Vérifier si l'utilisateur a des enfants
      const [countResults] = await db.query(
        'SELECT COUNT(*) as count FROM utilisateurs WHERE parent_id = ?',
        [targetUserId]
      );
      const childCount = countResults[0].count;

      if (childCount > 0)
        return res.status(400).json({ msg: "Impossible de supprimer cet utilisateur car il est le parent d'autres utilisateurs" });

      // Notification avant suppression
      await NotificationService.creerNotification(
        requesterId,
        targetUserId,
        'suppression_compte',
        'Compte supprimé',
        'Votre compte va être supprimé définitivement. Cette action est irréversible. Si vous pensez qu\'il s\'agit d\'une erreur, contactez immédiatement votre administrateur.'
      );

      // Nettoyage des dépendances dans l'ordre
      await db.query('DELETE FROM distributions WHERE donneur_id = ? OR receveur_id = ?', [targetUserId, targetUserId]);
      await db.query('DELETE FROM distributions_vip WHERE donneur_id = ? OR receveur_id = ?', [targetUserId, targetUserId]);

      // Mettre à NULL dans tickets / vip_tickets au lieu de supprimer
      await db.query(` UPDATE tickets SET rev_id = NULL WHERE rev_id = ?`, [targetUserId]);
      await db.query(` UPDATE tickets SET gros_id = NULL WHERE gros_id = ?`, [targetUserId]);
      await db.query(` UPDATE tickets SET crp_id = NULL WHERE crp_id = ?`, [targetUserId]);

      await db.query(` UPDATE vip_tickets SET rev_id = NULL WHERE rev_id = ?`, [targetUserId]);
      await db.query(`UPDATE vip_tickets SET gros_id = NULL WHERE gros_id = ?`, [targetUserId]);
      await db.query(` UPDATE vip_tickets SET crp_id = NULL WHERE crp_id = ?`, [targetUserId]);

      // Supprimer les notifications liées à cet utilisateur
      await db.query('DELETE FROM notifications WHERE expediteur_id = ? OR destinataire_id = ?', [targetUserId, targetUserId]);

      // Supprimer l'utilisateur
      await db.query('DELETE FROM utilisateurs WHERE id = ?', [targetUserId]);

      return res.status(200).json({ msg: "Utilisateur supprimé avec succès" });
    } else {
      return res.status(403).json({ msg: "Vous n'êtes pas autorisé à supprimer cet utilisateur" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Erreur lors de la suppression", error: err.message });
  }
});


// Route pour activer/désactiver le statut d'un utilisateur
router.put('/api/users/:id/toggle-status', veritoken, async (req, res) => {
    const targetUserId = req.params.id;
    const requesterId = req.userId;
    const requesterRoleId = req.roleId;
  
    try {
      const [results] = await db.query('SELECT * FROM utilisateurs WHERE id = ?', [targetUserId]);
      
      if (results.length === 0)
        return res.status(404).json({ "msg": "Utilisateur non trouvé" });
  
      const targetUser = results[0];
      const newStatus = !targetUser.est_actif;
  
      if (requesterRoleId === 1 ||
          (requesterRoleId === 2 && targetUser.role_id === 3 && targetUser.parent_id === requesterId) ||
          (requesterRoleId === 3 && targetUser.role_id === 4 && targetUser.parent_id === requesterId)) {
        
        await db.query('UPDATE utilisateurs SET est_actif = ? WHERE id = ?', [newStatus, targetUserId]);
        
        // Créer notification selon le nouveau statut
        const typeNotif = newStatus ? 'activation_compte' : 'desactivation_compte';
        const titre = newStatus ? 'Compte activé' : 'Compte désactivé';
        const message = newStatus 
          ? 'Votre compte a été réactivé. Vous pouvez maintenant accéder à toutes les fonctionnalités.'
          : 'Votre compte a été temporairement désactivé. Contactez votre administrateur pour plus d\'informations.';
        
        await NotificationService.creerNotification(
          requesterId,
          targetUserId,
          typeNotif,
          titre,
          message
        );
        
        const statusMessage = newStatus ? "activé" : "désactivé";
        res.status(200).json({ "msg": `Utilisateur ${statusMessage} avec succès` });
      } else {
        return res.status(403).json({ "msg": "Vous n'êtes pas autorisé à modifier le statut de cet utilisateur" });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ "msg": "Erreur lors de la mise à jour du statut", error: err.message });
    }
});

module.exports = router;
