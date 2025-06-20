const db = require('../../config/db');
const bcrypt = require("bcryptjs");
const ExcelJS = require('exceljs');


const ticketQueries = {
  generateTickets: async (quantity) => {
    try {
      const tickets = [];
      const insertValues = [];

      for (let i = 0; i < quantity; i++) {
        const qrCode = `geretonevent-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        tickets.push(qrCode);
        insertValues.push([qrCode, 'non_enregistre', null, null, null]);
      }

      const sql = `INSERT INTO tickets (code_qr, statut, date_activation, rev_id, gros_id, crp_id) VALUES ?`;
      const [result] = await db.query(sql, [insertValues]);
      
      return { generated: result.affectedRows, tickets };
    } catch (error) {
      throw error;
    }
  },

  activateTicket: async (codeQr2, revendeurId) => {
    try {
      // Récupération des informations du revendeur
      const [userResults] = await db.query('SELECT id, role_id, parent_id FROM utilisateurs WHERE id = ?', [revendeurId]);
      
      if (userResults.length === 0) {
        throw new Error("Revendeur non trouvé");
      }

      const codeQr = await bcrypt.hash(codeQr2, 10);

      const revendeur = userResults[0];

      if (revendeur.role_id !== 4) {
        throw new Error("Seuls les revendeurs peuvent activer des tickets");
      }

      const grossisteId = revendeur.parent_id;
      if (!grossisteId) {
        throw new Error("Ce revendeur n'a pas de grossiste associé.");
      }

      // Récupération des informations du grossiste
      const [grosResults] = await db.query('SELECT id, parent_id FROM utilisateurs WHERE id = ?', [grossisteId]);
      
      if (grosResults.length === 0) {
        throw new Error("Grossiste introuvable.");
      }

      const crpId = grosResults[0].parent_id;
      if (!crpId) {
        throw new Error("Ce grossiste n'est pas rattaché à un CRP.");
      }

      // Vérification de l'existence du ticket
      // const [existingResults] = await db.query('SELECT id FROM tickets WHERE code_qr = ?', [codeQr]);
      
      // if (existingResults.length > 0) {
      //   throw new Error("Ce ticket est déjà enregistré dans le système");
      // }*
      const [Tickets] = await db.query('SELECT id, code_qr FROM tickets');

      for (const ticket of Tickets) {
        const match = await bcrypt.compare(codeQr2, ticket.code_qr);
        if (match) {
          throw new Error("Ce ticket est deja enregistré dans le système");
        }
      }

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();

        // Insertion du ticket
        const insertTicketQuery = `
          INSERT INTO tickets (code_qr, statut, proprietaire_id, date_activation, rev_id, gros_id, crp_id)
          VALUES (?, 'active', ?, CURRENT_TIMESTAMP, ?, ?, ?)`;
        
        const [insertResult] = await connection.query(
          insertTicketQuery, 
          [codeQr, revendeurId, revendeurId, grossisteId, crpId]
        );

        // Mise à jour du nombre de tickets du revendeur
        await connection.query(
          'UPDATE utilisateurs SET nb_tickets = nb_tickets - 1 WHERE id = ?', 
          [revendeurId]
        );

        // Mise à jour du nombre de tickets vendus pour le revendeur, grossiste et CRP
        const updateVenQuery = `UPDATE utilisateurs SET nb_tickets_ven = nb_tickets_ven + 1 WHERE id IN (?, ?, ?)`;
        
        await connection.query(updateVenQuery, [revendeurId, grossisteId, crpId]);

        await connection.commit();
        
        return {
          success: true,
          ticketId: insertResult.insertId
        };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      throw error;
    }
  },

  verifyTicket: async (codeQr) => {
    try {
      const query = `
        SELECT t.id, t.statut, t.date_activation, t.code_qr, u.nom as revendeur_nom, u.prenoms as revendeur_prenoms 
        FROM tickets t 
        LEFT JOIN utilisateurs u ON t.rev_id = u.id`;

      const [results] = await db.query(query);

      let matchedTicket = null;

      for (const ticket of results) {
        const match = await bcrypt.compare(codeQr, ticket.code_qr);
        if (match) {
          matchedTicket = ticket;
          break;
        }
      }

      if (!matchedTicket) {
        return { valid: false, message: "Ticket non trouvé" };
      }

      let status, message;
      switch (matchedTicket.statut) {
        case 'active':
          status = "Valide";
          message = "Ce ticket est valide et a été activé";
          break;
        case 'desactive':
          status = "Non valide";
          message = "Ce ticket a été désactivé";
          break;
        default:
          status = "Non reconnu";
          message = "Ce ticket n'est pas reconnu par le système";
          break;
      }

      return {
        valid: matchedTicket.statut === 'active',
        status,
        message,
        ticketId: matchedTicket.id,
        activationDate: matchedTicket.date_activation,
        revendeur: matchedTicket.revendeur_nom
          ? `${matchedTicket.revendeur_nom} ${matchedTicket.revendeur_prenoms}`
          : null,
      };
    } catch (error) {
      throw error;
    }
  },


  deactivateTicket: async (ticketId, userId, roleId) => {
    try {
      let query;
      let params;
      
      if (roleId === 1) {
        query = 'SELECT * FROM tickets WHERE id = ?';
        params = [ticketId];
      } else if (roleId === 2) {
        query = 'SELECT * FROM tickets WHERE id = ? AND crp_id = ?';
        params = [ticketId, userId];
      } else if (roleId === 3) {
        query = 'SELECT * FROM tickets WHERE id = ? AND gros_id = ?';
        params = [ticketId, userId];
      } else {
        throw new Error("Vous n'avez pas les permissions nécessaires");
      }
      
      const [results] = await db.query(query, params);
      
      if (results.length === 0) {
        throw new Error("Ticket non trouvé ou vous n'avez pas les permissions pour le désactiver");
      }
      
      const updateQuery = `UPDATE tickets SET statut = 'desactive' WHERE id = ?`;
      await db.query(updateQuery, [ticketId]);
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  },

  getUserStats: async (userId, roleId) => {
    try {
      let stats = {};

      // Récupération du prix unitaire
      const [priceRes] = await db.query(`SELECT prix_unitaire FROM categories_tickets WHERE nom = "Standard"`);
      const unitPrice = priceRes[0]?.prix_unitaire || 8000;

      // Récupération des statistiques de l'utilisateur
      const [res] = await db.query(`SELECT nb_tickets_ven, nb_tickets FROM utilisateurs WHERE id = ?`, [userId]);

      stats.tickets = {
        activated: res[0].nb_tickets_ven || 0,
        not_registered: res[0].nb_tickets || 0,
        available: 0
      };

      // Récupération du nombre de tickets disponibles
      const [userRes] = await db.query(`SELECT nb_tickets FROM utilisateurs WHERE id = ?`, [userId]);
      stats.tickets.available = userRes[0]?.nb_tickets || 0;

      stats.chiffre_affaires = {
        total: stats.tickets.activated * unitPrice,
        disponible: stats.tickets.available * unitPrice
      };

      if (roleId === 2 || roleId === 3) {
        const fieldName = roleId === 2 ? 'grossistes' : 'revendeurs';
        const [children] = await db.query(`SELECT u.id, u.nom, u.prenoms, u.pseudo, u.nb_tickets, u.nb_tickets_ven, u.nb_tickets_reçu FROM utilisateurs u WHERE u.parent_id = ? AND u.est_actif = TRUE`, [userId]);
        
        stats[fieldName] = children;
      } else {
        const [activations] = await db.query(`SELECT id, code_qr, date_activation FROM tickets WHERE rev_id = ? AND statut = 'active' ORDER BY date_activation DESC`, [userId]);
        stats.activations = activations;
      }

      return stats;
    } catch (error) {
      throw error;
    }
  },
};

module.exports = ticketQueries;
