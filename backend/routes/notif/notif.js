const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const veritoken = require('../../Middleware/auth');

router.post('/api/notifications/send', veritoken, async (req, res) => {
    try {
        const { destinataire_id, type, titre, message, donnees_json } = req.body;
        const expediteur_id = req.userId;

        const [enfant] = await db.execute(
            'SELECT parent_id FROM utilisateurs WHERE id = ?',
            [destinataire_id]
        );

        if (!enfant.length) {
            return res.status(404).json({ msg: 'Utilisateur destinataire non trouvé' });
        }

        const [result] = await db.execute(
            `INSERT INTO notifications (expediteur_id, destinataire_id, type, titre, message, donnees_json) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [expediteur_id, destinataire_id, type, titre, message, JSON.stringify(donnees_json) || null]
        );

        res.status(201).json({
            msg: 'Notification envoyée avec succès',
            notification_id: result.insertId
        });

    } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification:', error);
        res.status(500).json({ msg: 'Erreur serveur' });
    }
});

router.get('/api/notifications', veritoken, async (req, res) => {
    try {
        const utilisateur_id = req.userId;
        const { limit = 20, offset = 0, non_lues_seulement = false } = req.query;

        let query = `
            SELECT n.*, 
                   u.nom as expediteur_nom, 
                   u.prenoms as expediteur_prenoms,
                   u.pseudo as expediteur_pseudo
            FROM notifications n
            JOIN utilisateurs u ON n.expediteur_id = u.id
            WHERE n.destinataire_id = ?
        `;
        
        const params = [utilisateur_id];

        if (non_lues_seulement === 'true') {
            query += ' AND n.lu = FALSE';
        }

        query += ' ORDER BY n.date_creation DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [notifications] = await db.execute(query, params);

        const notificationsFormatees = notifications.map(notif => ({
            ...notif,
            donnees_json: notif.donnees_json ? JSON.parse(notif.donnees_json) : null
        }));

        res.json(notificationsFormatees);

    } catch (error) {
        console.error('Erreur lors de la récupération des notifications:', error);
        res.status(500).json({ msg: 'Erreur serveur' });
    }
});

router.put('/api/notifications/:id/lue', veritoken, async (req, res) => {
    try {
        const notification_id = req.params.id;
        const utilisateur_id = req.userId;

        const [notification] = await db.execute(
            'SELECT destinataire_id FROM notifications WHERE id = ?',
            [notification_id]
        );

        if (!notification.length) {
            return res.status(404).json({ msg: 'Notification non trouvée' });
        }

        if (notification[0].destinataire_id !== utilisateur_id) {
            return res.status(403).json({ msg: 'Vous ne pouvez modifier que vos propres notifications' });
        }

        await db.execute(
            'UPDATE notifications SET lu = TRUE, date_lecture = CURRENT_TIMESTAMP WHERE id = ?',
            [notification_id]
        );

        res.json({ msg: 'Notification marquée comme lue' });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de la notification:', error);
        res.status(500).json({ msg: 'Erreur serveur' });
    }
});

router.put('/api/notifications/marquer-toutes-lues', veritoken, async (req, res) => {
    try {
        const utilisateur_id = req.userId;

        await db.execute(
            'UPDATE notifications SET lu = TRUE, date_lecture = CURRENT_TIMESTAMP WHERE destinataire_id = ? AND lu = FALSE',
            [utilisateur_id]
        );

        res.json({ msg: 'Toutes les notifications ont été marquées comme lues' });

    } catch (error) {
        console.error('Erreur lors de la mise à jour des notifications:', error);
        res.status(500).json({ msg: 'Erreur serveur' });
    }
});

router.get('/api/notifications/non-lues/count', veritoken, async (req, res) => {
    try {
        const utilisateur_id = req.userId;

        const [result] = await db.execute(
            'SELECT COUNT(*) as count FROM notifications WHERE destinataire_id = ? AND lu = FALSE',
            [utilisateur_id]
        );

        res.json({ count: result[0].count });

    } catch (error) {
        console.error('Erreur lors du comptage des notifications non lues:', error);
        res.status(500).json({ msg: 'Erreur serveur' });
    }
});

router.delete('/api/notifications/:id', veritoken, async (req, res) => {
    try {
        const notification_id = req.params.id;
        const utilisateur_id = req.userId;

        const [notification] = await db.execute(
            'SELECT destinataire_id FROM notifications WHERE id = ?',
            [notification_id]
        );

        if (!notification.length) {
            return res.status(404).json({ msg: 'Notification non trouvée' });
        }

        if (notification[0].destinataire_id !== utilisateur_id) {
            return res.status(403).json({ msg: 'Vous ne pouvez supprimer que vos propres notifications' });
        }

        await db.execute('DELETE FROM notifications WHERE id = ?', [notification_id]);

        res.json({ msg: 'Notification supprimée avec succès' });

    } catch (error) {
        console.error('Erreur lors de la suppression de la notification:', error);
        res.status(500).json({ msg: 'Erreur serveur' });
    }
});

router.get('/api/notifications/enfants', veritoken, async (req, res) => {
    try {
        const parent_id = req.userId;

        const [enfants] = await db.execute(
            `SELECT id, nom, prenoms, pseudo, email, est_actif 
             FROM utilisateurs 
             WHERE parent_id = ? AND est_actif = TRUE`,
            [parent_id]
        );

        res.json(enfants);

    } catch (error) {
        console.error('Erreur lors de la récupération des enfants:', error);
        res.status(500).json({ msg: 'Erreur serveur' });
    }
});

router.post('/api/send-alert', veritoken, async (req, res) => {
    try {
        const { enfant_id, message } = req.body;
        const parent_id = req.userId;

        await NotificationService.creerNotification(
            parent_id,
            enfant_id,
            'alerte',
            'Alerte importante',
            message
        );

        res.json({ msg: 'Alerte envoyée' });

    } catch (error) {
        console.error('Erreur envoi alerte:', error);
        res.status(500).json({ msg: 'Erreur serveur' });
    }
});

module.exports = router;