const db = require('../../config/db');
const sendMail = require('../../config/mail');

class NotificationService {
    
    static async creerNotificationDistribution(donneurId, receveurId, nombreTickets, type = 'tickets') {
        try {
            const typeNotif = type === 'vip' ? 'distribution_vip' : 'distribution_tickets';
            const titre = type === 'vip' ? 'Réception de tickets VIP' : 'Réception de tickets';
            const message = `Vous avez reçu ${nombreTickets} ${type === 'vip' ? 'tickets VIP' : 'tickets'} de votre parent.`;
            
            const donnees = {
                nombre_tickets: nombreTickets,
                type_ticket: type
            };

            await db.execute(
                `INSERT INTO notifications (expediteur_id, destinataire_id, type, titre, message, donnees_json) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [donneurId, receveurId, typeNotif, titre, message, JSON.stringify(donnees)]
            );

            await this.envoyerNotificationEmail(receveurId, titre, message);

        } catch (error) {
            console.error('Erreur lors de la création de la notification de distribution:', error);
        }
    }

    static async creerNotification(expediteurId, destinataireId, type, titre, message, donneesJson = null) {
        try {
            await db.execute(
                `INSERT INTO notifications (expediteur_id, destinataire_id, type, titre, message, donnees_json) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [expediteurId, destinataireId, type, titre, message, JSON.stringify(donneesJson)]
            );

            if (type === 'alerte') {
                await this.envoyerNotificationEmail(destinataireId, titre, message);
            }

        } catch (error) {
            console.error('Erreur lors de la création de la notification:', error);
        }
    }

    static async envoyerNotificationEmail(utilisateurId, titre, message) {
        try {
            const [utilisateur] = await db.execute(
                'SELECT email, nom, prenoms FROM utilisateurs WHERE id = ?',
                [utilisateurId]
            );

            if (utilisateur.length > 0) {
                const { email, nom, prenoms } = utilisateur[0];
                const sujet = `geretonevent - ${titre}`;
                const messageComplet = `Bonjour ${prenoms} ${nom},\n\n${message}\n\nCordialement,\nL'équipe geretonevent`;
                
                await sendMail(messageComplet, email, sujet);
            }
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email de notification:', error);
        }
    }

    static async notifierTousLesEnfants(parentId, type, titre, message, donneesJson = null) {
        try {
            const [enfants] = await db.execute(
                'SELECT id FROM utilisateurs WHERE parent_id = ? AND est_actif = TRUE',
                [parentId]
            );

            for (const enfant of enfants) {
                await this.creerNotification(parentId, enfant.id, type, titre, message, donneesJson);
            }

        } catch (error) {
            console.error('Erreur lors de la notification de tous les enfants:', error);
        }
    }

    static async nettoyerAnciennesNotifications(joursAConserver = 30) {
        try {
            await db.execute(
                'DELETE FROM notifications WHERE date_creation < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [joursAConserver]
            );
        } catch (error) {
            console.error('Erreur lors du nettoyage des anciennes notifications:', error);
        }
    }
}

module.exports = NotificationService;