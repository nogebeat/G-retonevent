const db = require('../../config/db');
const bcrypt = require("bcryptjs");
const ExcelJS = require('exceljs');


const vipTicketQueries = {
  generateVipTickets: async (quantity) => {
    try {
      const tickets = [];
      const insertValues = [];

      for (let i = 0; i < quantity; i++) {
        const qrCode = `VIP-FESTICHILL-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        tickets.push(qrCode);
        insertValues.push([qrCode, 'non_enregistre', null, null, null]);
      }

      const sql = `INSERT INTO vip_tickets (code_qr, statut, date_activation, rev_id, gros_id, crp_id) VALUES ?`;
      const [result] = await db.query(sql, [insertValues]);
      
      return { generated: result.affectedRows, tickets };
    } catch (error) {
      throw error;
    }
  },

  activateVipTicket: async (codeQr2, revendeurId) => {
    try {
      // Récupération des informations du revendeur
      const [userResults] = await db.query('SELECT id, role_id, parent_id FROM utilisateurs WHERE id = ?', [revendeurId]);
      
      if (userResults.length === 0) {
        throw new Error("Revendeur non trouvé");
      }

      const codeQr = await bcrypt.hash(codeQr2, 10);

      const revendeur = userResults[0];

      if (revendeur.role_id !== 4) {
        throw new Error("Seuls les revendeurs peuvent activer des tickets VIP");
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

      // Vérification de l'existence du ticket VIP
      // Récupération de tous les tickets
      const [vipTickets] = await db.query('SELECT id, code_qr FROM vip_tickets');

      // Vérifie si le code existe déjà
      for (const ticket of vipTickets) {
        const match = await bcrypt.compare(codeQr2, ticket.code_qr);
        if (match) {
          throw new Error("Ce ticket VIP est déjà enregistré dans le système");
        }
      }

      // Vérification que le revendeur a des tickets VIP disponibles
      const [revendeurTickets] = await db.query('SELECT nb_vip FROM utilisateurs WHERE id = ?', [revendeurId]);
      
      if (revendeurTickets.length === 0 || revendeurTickets[0].nb_vip <= 0) {
        throw new Error("Vous n'avez pas de tickets VIP disponibles pour l'activation");
      }

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();

        // Insertion du ticket VIP
        const insertTicketQuery = `
          INSERT INTO vip_tickets (code_qr, statut, proprietaire_id, date_activation, rev_id, gros_id, crp_id)
          VALUES (?, 'active', ?, CURRENT_TIMESTAMP, ?, ?, ?)`;
        
        const [insertResult] = await connection.query(
          insertTicketQuery, 
          [codeQr, revendeurId, revendeurId, grossisteId, crpId]
        );

        // Mise à jour du nombre de tickets VIP du revendeur
        await connection.query(
          'UPDATE utilisateurs SET nb_vip = nb_vip - 1 WHERE id = ?', 
          [revendeurId]
        );

        // Mise à jour du nombre de tickets VIP vendus pour le revendeur, grossiste et CRP
        const updateVenQuery = `UPDATE utilisateurs SET nb_vip_ven = nb_vip_ven + 1 WHERE id IN (?, ?, ?)`;
        
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

  verifyVipTicket: async (codeQr) => {
    try {
      const query = `
        SELECT v.id, v.statut, v.date_activation, v.code_qr, u.nom as revendeur_nom, u.prenoms as revendeur_prenoms 
        FROM vip_tickets v 
        LEFT JOIN utilisateurs u ON v.rev_id = u.id`;

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
        return { valid: false, message: "Ticket VIP non trouvé" };
      }

      let status, message;
      switch (matchedTicket.statut) {
        case 'active':
          status = "Valide";
          message = "Ce ticket VIP est valide et a été activé";
          break;
        case 'desactive':
          status = "Non valide";
          message = "Ce ticket VIP a été désactivé";
          break;
        default:
          status = "Non reconnu";
          message = "Ce ticket VIP n'est pas reconnu par le système";
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
        type: 'VIP'
      };
    } catch (error) {
      throw error;
    }
  },

  deactivateVipTicket: async (ticketId, userId, roleId) => {
    try {
      let query;
      let params;
      
      if (roleId === 1) {
        query = 'SELECT * FROM vip_tickets WHERE id = ?';
        params = [ticketId];
      } else if (roleId === 2) {
        query = 'SELECT * FROM vip_tickets WHERE id = ? AND crp_id = ?';
        params = [ticketId, userId];
      } else if (roleId === 3) {
        query = 'SELECT * FROM vip_tickets WHERE id = ? AND gros_id = ?';
        params = [ticketId, userId];
      } else {
        throw new Error("Vous n'avez pas les permissions nécessaires");
      }
      
      const [results] = await db.query(query, params);
      
      if (results.length === 0) {
        throw new Error("Ticket VIP non trouvé ou vous n'avez pas les permissions pour le désactiver");
      }
      
      const updateQuery = `UPDATE vip_tickets SET statut = 'desactive' WHERE id = ?`;
      await db.query(updateQuery, [ticketId]);
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  },

  getUserVipStats: async (userId, roleId) => {
    try {
      let stats = {};

      // Récupération du prix unitaire VIP
      const [priceRes] = await db.query(`SELECT prix_unitaire FROM categories_tickets WHERE nom = "VIP"`);
      const unitPrice = priceRes[0]?.prix_unitaire || 30000;

      // Récupération des statistiques VIP de l'utilisateur
      const [res] = await db.query(`SELECT nb_vip_ven, nb_vip FROM utilisateurs WHERE id = ? `, [userId]);

      stats.tickets = {
        activated: res[0].nb_vip_ven || 0,
        not_registered: res[0].nb_vip || 0,
        available: 0
      };

      // Récupération du nombre de tickets VIP disponibles
      const [userRes] = await db.query(`SELECT nb_vip FROM utilisateurs WHERE id = ?`, [userId]);
      stats.tickets.available = userRes[0]?.nb_vip || 0;

      stats.chiffre_affaires_vip = {
        total: stats.tickets.activated * unitPrice,
        disponible: stats.tickets.available * unitPrice
      };

      if (roleId === 2 || roleId === 3) {
        const fieldName = roleId === 2 ? 'grossistes' : 'revendeurs';
        const [children] = await db.query(`SELECT u.id, u.nom, u.prenoms, u.pseudo, u.nb_vip, u.nb_vip_ven, u.nb_vip_reçu FROM utilisateurs u WHERE u.parent_id = ? AND u.est_actif = TRUE`, [userId]);
        
        stats[fieldName + '_vip'] = children;
      } else {
        const [activations] = await db.query(`SELECT id, code_qr, date_activation FROM vip_tickets WHERE rev_id = ? AND statut = 'active' ORDER BY date_activation DESC`, [userId]);
        
        stats.vip_activations = activations;
      }

      return stats;
    } catch (error) {
      throw error;
    }
  },

  // Fonction pour obtenir les statistiques combinées (tickets normaux + VIP)
  getCombinedUserStats: async (userId, roleId) => {
    try {
      const [normalStats, vipStats] = await Promise.all([
        ticketQueries.getUserStats(userId, roleId),
        vipTicketQueries.getUserVipStats(userId, roleId)
      ]);

      return {
        ...normalStats,
        ...vipStats,
        combined: {
          total_activated: (normalStats.tickets?.activated || 0) + (vipStats.tickets?.activated || 0),
          total_available: (normalStats.tickets?.available || 0) + (vipStats.tickets?.available || 0),
          total_revenue: (normalStats.chiffre_affaires?.total || 0) + (vipStats.chiffre_affaires_vip?.total || 0)
        }
      };
    } catch (error) {
      throw error;
    }
  },

  // Fonction pour obtenir l'historique des distributions VIP
  getVipDistributionHistory: async (userId) => {
    try {
      const query = `
        SELECT d.*, 
               ur.nom as receveur_nom, ur.prenoms as receveur_prenoms, ur.telephone as receveur_telephone,
               ud.nom as donneur_nom, ud.prenoms as donneur_prenoms
        FROM distributions_vip d
        JOIN utilisateurs ur ON d.receveur_id = ur.id
        JOIN utilisateurs ud ON d.donneur_id = ud.id
        ORDER BY d.date_distribution DESC
      `;

      const [results] = await db.query(query, [userId]);
      return results;
    } catch (error) {
      throw error;
    }
  },

  // Fonction pour obtenir la liste des tickets VIP avec filtres
  getVipTicketsWithFilters: async (filters = {}) => {
    try {
      const { proprietaire_id, statut, page = 1, limit = 10 } = filters;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let conditions = [];
      let params = [];

      if (proprietaire_id) {
        conditions.push('v.proprietaire_id = ?');
        params.push(proprietaire_id);
      }

      if (statut) {
        conditions.push('v.statut = ?');
        params.push(statut);
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

      // Requête pour compter les tickets VIP
      const countQuery = `SELECT COUNT(*) as total FROM vip_tickets v ${whereClause}`;
      const [countResult] = await db.query(countQuery, params);
      
      const total = countResult[0].total;
      const totalPages = Math.ceil(total / parseInt(limit));
      
      // Requête pour récupérer les tickets VIP
      const vipTicketsQuery = `
        SELECT 
          v.*, 
          u.nom AS proprietaire_nom, 
          u.prenoms AS proprietaire_prenoms, 
          u.pseudo AS proprietaire_pseudo, 
          r.nom AS role_proprietaire, 
          'VIP' AS categorie_nom, 
          30000.00 AS prix_unitaire 
        FROM vip_tickets v 
        LEFT JOIN utilisateurs u ON v.proprietaire_id = u.id 
        LEFT JOIN roles r ON u.role_id = r.id 
        ${whereClause} 
        ORDER BY v.date_activation DESC 
        LIMIT ? OFFSET ?`;

      const finalParams = [...params, parseInt(limit), offset];
      const [vipTickets] = await db.query(vipTicketsQuery, finalParams);

      return {
        vipTickets,
        pagination: {
          total,
          per_page: parseInt(limit),
          current_page: parseInt(page),
          total_pages: totalPages
        }
      };
    } catch (error) {
      throw error;
    }
  }
};



module.exports = vipTicketQueries;
