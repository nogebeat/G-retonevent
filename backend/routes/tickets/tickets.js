const express = require('express');
const router = express.Router();
const veritoken = require('../../Middleware/auth');
const QRCode = require('qrcode');
const db = require('../../config/db');
const ticketQueries = require('./tickets-query');
const sendMail = require('../../config/mail');
const {checkRole} = require('../../Middleware/checkRole');
const ExcelJS = require('exceljs');
const NotificationService = require('../notif/notif-query'); 



// Route pour générer des tickets (Admin uniquement)
router.post('/api/tickets/generate', veritoken, checkRole([1]), async (req, res) => {
  const { quantity } = req.body;
  
  if (!quantity || quantity <= 0 || quantity > 1000) {
    return res.status(400).json({ msg: "Quantité invalide (doit être entre 1 et 1000)" });
  }
  
  try {
    const result = await ticketQueries.generateTickets(quantity);
    
    res.status(201).json({ 
      msg: `${result.generated} tickets générés avec succès`, 
      count: result.generated 
    });
  } catch (err) {
    console.error("Erreur génération tickets:", err);
    return res.status(500).json({ msg: "Erreur lors de la génération des tickets", error: err.message });
  }
});

router.post('/api/tickets/activate', veritoken, checkRole([4]), async (req, res) => {
  const { codeQr } = req.body;
  const revendeurId = req.userId;
  
  if (!codeQr) {
    return res.status(400).json({ msg: "Code QR requis" });
  }
  
  try {
    const result = await ticketQueries.activateTicket(codeQr, revendeurId);
    
    res.status(201).json({ 
      msg: "Ticket activé avec succès",
      ticketId: result.ticketId
    });
  } catch (err) {
    console.error("Erreur activation ticket:", err);
    return res.status(400).json({ msg: err.message || "Erreur lors de l'activation du ticket" });
  }
});

router.get('/api/tickets/verify/:codeQr', async (req, res) => {
  const { codeQr } = req.params;
  
  if (!codeQr) {
    return res.status(400).json({ msg: "Code QR requis" });
  }
  
  try {
    const result = await ticketQueries.verifyTicket(codeQr);
    // res.status(200).json(result);
    // console.log(result);
    if (result.valid === false)
      return res.status(404).json({ msg: "Ticket non trouvé" });
    else
      return res.status(200).json(result);
      
  } catch (err) {
    console.error("Erreur vérification ticket:", err);
    return res.status(500).json({ msg: "Erreur lors de la vérification du ticket" });
  }
});

router.put('/api/tickets/:id/deactivate', veritoken, checkRole([1, 2, 3]), async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  const roleId = req.roleId;
  
  try {
    const result = await ticketQueries.deactivateTicket(id, userId, roleId);
    res.status(200).json({ msg: "Ticket désactivé avec succès" });
  } catch (err) {
    console.error("Erreur désactivation ticket:", err);
    return res.status(400).json({ msg: err.message || "Erreur lors de la désactivation du ticket" });
  }
});

router.get('/api/stats', veritoken, async (req, res) => {
  const userId = req.userId;
  const roleId = req.roleId;
  
  try {
    const stats = await ticketQueries.getUserStats(userId, roleId);
    res.status(200).json(stats);
  } catch (err) {
    console.error("Erreur récupération stats:", err);
    return res.status(500).json({ msg: "Erreur lors de la récupération des statistiques" });
  }
});

// Route pour obtenir les statistiques d'un utilisateur spécifique (pour admin, CRP, grossiste)
router.get('/api/stats/:userId', veritoken, checkRole([1, 2, 3]), async (req, res) => {
  const { userId } = req.params;
  const currentUserRole = req.roleId;
  const currentUserId = req.userId;

  try {
    const [results] = await db.query('SELECT role_id, parent_id FROM utilisateurs WHERE id = ?', [userId]);
    
    if (results.length === 0) {
      return res.status(404).json({ msg: "Utilisateur non trouvé" });
    }

    const targetRole = results[0].role_id;
    const parentId = results[0].parent_id;
    let hasPermission = false;

    const proceedWithStats = async () => {
      try {
        const stats = await ticketQueries.getUserStats(userId, targetRole);
        res.status(200).json(stats);
      } catch (error) {
        console.error("Erreur récupération stats:", error);
        return res.status(500).json({ msg: "Erreur lors de la récupération des statistiques" });
      }
    };

    if (currentUserRole === 1) {
      hasPermission = true;
      await proceedWithStats();
    } else if (currentUserRole === 2 && targetRole > 2) {
      if (targetRole === 3 && parentId === currentUserId) {
        hasPermission = true;
        await proceedWithStats();
      } else if (targetRole === 4) {
        const [parentResults] = await db.query('SELECT parent_id FROM utilisateurs WHERE id = ?', [parentId]);
        if (parentResults.length > 0 && parentResults[0].parent_id === currentUserId) {
          hasPermission = true;
          await proceedWithStats();
        } else {
          return res.status(403).json({ msg: "Vous n'êtes pas autorisé à voir les statistiques de cet utilisateur" });
        }
      } else {
        return res.status(403).json({ msg: "Vous n'êtes pas autorisé à voir les statistiques de cet utilisateur" });
      }
    } else if (currentUserRole === 3 && targetRole === 4 && parentId === currentUserId) {
      hasPermission = true;
      await proceedWithStats();
    } else {
      return res.status(403).json({ msg: "Vous n'êtes pas autorisé à voir les statistiques de cet utilisateur" });
    }
  } catch (error) {
    console.error("Erreur lors de la vérification des permissions:", error);
    return res.status(500).json({ msg: "Erreur serveur" });
  }
});

router.get('/api/tickets/qr/:codeQr', (req, res) => {
  const { codeQr } = req.params;
  
  QRCode.toDataURL(codeQr, (err, url) => {
    if (err) {
      console.error("Erreur génération QR code:", err);
      return res.status(500).json({ msg: "Erreur lors de la génération du QR code" });
    }
    
    res.json({ qrCode: url });
  });
});

router.put('/api/tickets/:nb', veritoken, async (req, res) => {
  const userId = req.userId;
  const nb = req.params.nb;
  
  try {
    const query = `UPDATE utilisateurs SET nb_tickets = ? WHERE id = ?`;
    await db.query(query, [nb, userId]);
    
    res.status(200).json({msg: `${nb} ticket(s) sont disponibles sur cette id` });
  } catch (err) {
    console.error("Erreur lors de la modification du nombre de tickets disponible :", err);
    return res.status(500).json({ msg: "Erreur lors de la modification du nombre de tickets disponible" });
  }
});

router.get('/api/tickets/vente', veritoken, async (req, res) => {
  const userId = req.userId;
  
  try {
    const query = `SELECT nb_tickets_ven FROM utilisateurs WHERE id = ?`;
    const [results] = await db.query(query, [userId]);
    
    res.status(200).json({tickets: results[0].nb_tickets_ven });
  } catch (err) {
    console.error("Erreur lors de l'obtention du nombre de tickets vendu :", err);
    return res.status(500).json({ msg: "Erreur lors de l'obtention du nombre de tickets vendu" });
  }
});

router.get('/api/tickets/remis', veritoken, async (req, res) => {
  const userId = req.userId;
  
  try {
    const query = `SELECT nb_tickets_reçu FROM utilisateurs WHERE id = ?`;
    const [results] = await db.query(query, [userId]);
    
    res.status(200).json({tickets: results[0].nb_tickets_reçu });
  } catch (err) {
    console.error("Erreur lors de l'obtention du nombre de tickets reçu :", err);
    return res.status(500).json({ msg: "Erreur lors de l'obtention du nombre de tickets reçu" });
  }
});

router.get('/api/tickets/dispo', veritoken, async (req, res) => {
  const userId = req.userId;
  
  try {
    const query = `SELECT nb_tickets FROM utilisateurs WHERE id = ?`;
    const [results] = await db.query(query, [userId]);
    
    if (results.length === 0) {
      return res.status(404).json({ msg: "Utilisateur non trouvé" });
    }
    
    const nb = results[0].nb_tickets;
    res.status(200).json({ tickets: nb });
  } catch (err) {
    console.error("Erreur lors de l'obtention du nombre de tickets disponible :", err);
    return res.status(500).json({ msg: "Erreur lors de l'obtention du nombre de tickets disponible" });
  }
});

// const NotificationService = require('../../services/NotificationService'); // Ajout de l'import

router.post('/api/tickets/distro', veritoken, checkRole([1, 2, 3]), async (req, res) => {
  const donneurId = req.userId;
  const donneurRole = req.roleId;

  const { recv_id, nb_distro } = req.body;

  if (!recv_id || nb_distro === undefined || nb_distro === null) {
    return res.status(400).json({ msg: "recv_id et nb_distro sont requis." });
  }

  // Vérifier que nb_distro n'est pas égal à 0
  if (nb_distro === 0) {
    return res.status(400).json({ msg: "Le nombre de tickets à distribuer ne peut pas être égal à 0." });
  }

  try {
    // Vérifier le rôle du receveur
    const [receveurResults] = await db.query('SELECT role_id, nb_tickets FROM utilisateurs WHERE id = ?', [recv_id]);
    
    if (receveurResults.length === 0) {
      return res.status(404).json({ msg: "Receveur introuvable." });
    }

    const receveurRole = receveurResults[0].role_id;
    const nbTicketsReceveur = receveurResults[0].nb_tickets;

    if (donneurRole >= receveurRole) {
      return res.status(403).json({ msg: "Vous ne pouvez distribuer des tickets qu'à un rôle inférieur au vôtre." });
    }

    // Vérifier les tickets du donneur (seulement si c'est une distribution positive)
    if (nb_distro > 0) {
      const [donneurResults] = await db.query('SELECT nb_tickets FROM utilisateurs WHERE id = ?', [donneurId]);
      const nbTicketsDonneur = donneurResults[0].nb_tickets;

      if (nbTicketsDonneur < nb_distro) {
        return res.status(400).json({ msg: "Nombre de tickets insuffisant pour la distribution." });
      }
    }

    // Vérifier les tickets du receveur (si c'est un retrait - nb_distro négatif)
    if (nb_distro < 0) {
      const nbTicketsARetirer = Math.abs(nb_distro);
      
      if (nbTicketsReceveur < nbTicketsARetirer) {
        return res.status(400).json({ 
          msg: `Impossible de retirer ${nbTicketsARetirer} ticket(s). Le receveur n'a que ${nbTicketsReceveur} ticket(s) en stock.` 
        });
      }
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query('UPDATE utilisateurs SET nb_tickets = nb_tickets - ? WHERE id = ?', [nb_distro, donneurId]);
      
      await connection.query('UPDATE utilisateurs SET nb_tickets = nb_tickets + ? WHERE id = ?', [nb_distro, recv_id]);
      
      await connection.query('UPDATE utilisateurs SET nb_tickets_reçu = nb_tickets_reçu + ? WHERE id = ?', [nb_distro, recv_id]); 
      
      await connection.query(
        'INSERT INTO distributions (donneur_id, receveur_id, nombre_tickets) VALUES (?, ?, ?)', 
        [donneurId, recv_id, nb_distro]
      );

      const [recev] = await connection.query('SELECT pseudo, email, nom, prenoms FROM utilisateurs WHERE id = ?', [recv_id]);
      const [donn] = await connection.query('SELECT nom, prenoms FROM utilisateurs WHERE id = ?', [donneurId]);
      const donneur = donn[0];
      const receveur = recev[0];

      await connection.commit();
      
      if (nb_distro > 0) {
        // Distribution de tickets
        const roleText = donneurId == 2 ? "Super-Grossiste" : "Grossiste";
        
        await NotificationService.creerNotification(
          donneurId,
          recv_id,
          'distribution_tickets',
          'Réception de tickets',
          `Vous avez reçu ${nb_distro} ticket(s) de votre ${roleText} ${donneur.nom} ${donneur.prenoms}.`,
          {
            nombre_tickets: nb_distro,
            type_operation: 'distribution',
            donneur_nom: `${donneur.nom} ${donneur.prenoms}`,
            donneur_role: roleText
          }
        );

        const emailContent = `Bonjour ${receveur.nom},

Vous venez de recevoir ${nb_distro} ticket(s) de votre ${roleText} ${donneur.nom} ${donneur.prenoms}. Nous comptons sur vous pour la vente de vos tickets.

En cas d'erreur, veuillez contacter votre ${roleText}.

Merci de ne pas répondre à ce mail. Veuillez contacter un administrateur si vous n'avez pas reçu de tickets sur la plateforme : https://wa.me/+229956549199`;

        sendMail(emailContent, receveur.email, "Réception de tickets");
        
        return res.status(200).json({ 
          msg: `Succès : ${nb_distro} ticket(s) transféré(s) à l'utilisateur ${receveur.pseudo}.` 
        });

      } else {
        const nbTicketsRetires = Math.abs(nb_distro);
        const roleText = donneurId === 2 ? "Super-Grossiste" : "Grossiste";
        
        await NotificationService.creerNotification(
          donneurId,
          recv_id,
          'retrait_tickets',
          'Retrait de tickets',
          `${nbTicketsRetires} ticket(s) ont été retirés de votre compte par votre ${roleText} ${donneur.nom} ${donneur.prenoms}.`,
          {
            nombre_tickets: nbTicketsRetires,
            type_operation: 'retrait',
            donneur_nom: `${donneur.nom} ${donneur.prenoms}`,
            donneur_role: roleText
          }
        );

        const emailContent = `Bonjour ${receveur.nom},

Vous venez de vous voir retirer ${nbTicketsRetires} ticket(s) par votre ${roleText} ${donneur.nom} ${donneur.prenoms}.

Si vous pensez qu'il s'agit d'une erreur, veuillez contacter votre ${roleText}.

Merci de ne pas répondre à ce mail. En cas de problème d'affichage de vos tickets sur la plateforme, veuillez contacter un administrateur via : https://wa.me/+229956549199

Cordialement,
L'équipe de gestion des tickets.`;

        sendMail(emailContent, receveur.email, "Retrait de tickets");
        
        return res.status(200).json({ 
          msg: `Succès : ${nbTicketsRetires} ticket(s) retiré(s) à l'utilisateur ${receveur.pseudo}.` 
        });
      }

    } catch (error) {
      await connection.rollback();
      console.error("Erreur lors de la distribution:", error);
      return res.status(500).json({ msg: "Erreur lors de la distribution des tickets." });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Erreur lors de la vérification:", error);
    return res.status(500).json({ msg: "Erreur serveur." });
  }
});

// Route pour lister les tickets avec filtres, pagination et infos utiles
router.get('/api/tickets', veritoken, async (req, res) => {
  const { proprietaire_id, statut, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let conditions = [];
    let params = [];

    if (proprietaire_id) {
      conditions.push('t.proprietaire_id = ?');
      params.push(proprietaire_id);
    }

    if (statut) {
      conditions.push('t.statut = ?');
      params.push(statut);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Requête pour compter les tickets
    const countQuery = `SELECT COUNT(*) as total FROM tickets t ${whereClause}`;
    const [countResult] = await db.query(countQuery, params);
    
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / parseInt(limit));
    
    // Requête pour récupérer les tickets
    const ticketsQuery = `
      SELECT 
        t.*, u.nom AS proprietaire_nom, u.prenoms AS proprietaire_prenoms, u.pseudo AS proprietaire_pseudo, 
        r.nom AS role_proprietaire, 'Standard' AS categorie_nom, 8000.00 AS prix_unitaire 
      FROM tickets t 
      LEFT JOIN utilisateurs u ON t.proprietaire_id = u.id 
      LEFT JOIN roles r ON u.role_id = r.id 
      ${whereClause} 
      ORDER BY t.date_activation DESC 
      LIMIT ? OFFSET ?`;

    const finalParams = [...params, parseInt(limit), offset];
    const [tickets] = await db.query(ticketsQuery, finalParams);

    res.status(200).json({
      tickets,
      pagination: {
        total,
        per_page: parseInt(limit),
        current_page: parseInt(page),
        total_pages: totalPages
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des tickets:", error);
    return res.status(500).json({ msg: "Erreur lors de la récupération des tickets" });
  }
});

router.get('/api/distributions/history', veritoken, async (req, res) => {
  const userId = req.userId;

  try {
    // Récupère l'historique des distributions où l'utilisateur est le donneur
    const query = `
      SELECT d.*, 
             ur.nom as receveur_nom, ur.prenoms as receveur_prenoms, ur.telephone as receveur_telephone
      FROM distributions d
      JOIN utilisateurs ur ON d.receveur_id = ur.id
      WHERE d.donneur_id = ?
      ORDER BY d.date_distribution DESC
    `;

    const [results] = await db.query(query, [userId]);

    return res.status(200).json({ 
      msg: "Historique des distributions récupéré avec succès.",
      distributions: results
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique des distributions :", error);
    return res.status(500).json({ msg: "Erreur serveur lors de la récupération de l'historique." });
  }
});

router.post('/api/tickets/activator', (req, res) => {
  res.status(200).json("c'est bon tcha ");
});

router.get('/api/ticket', veritoken, async (req, res) => {
  const userId = req.userId;
  const roleId = req.roleId;

  try {
    let query = '';
    let values = [];

    if (roleId === 1) {
      query = `SELECT * FROM tickets`;
    } else if (roleId === 2) {
      query = `
        SELECT 
          rev.nom AS nom_rev, rev.prenoms AS prenoms_rev, rev.cip AS cip_rev,
          t.code_qr, rev.telephone AS tel_rev, t.date_activation, t.id,
          gros.nom AS nom_gros, gros.prenoms AS prenoms_gros, gros.telephone AS tel_gros
        FROM tickets t JOIN utilisateurs gros ON t.gros_id = gros.id JOIN utilisateurs rev ON t.rev_id = rev.id WHERE gros.parent_id = ?`;
      values = [userId];
    } else if (roleId === 3) {
      query = `
        SELECT rev.nom AS nom_rev, rev.prenoms AS prenoms_rev, rev.cip AS cip_rev,
               t.code_qr, rev.telephone AS tel_rev, t.date_activation, t.id
        FROM tickets t JOIN utilisateurs rev ON t.rev_id = rev.id WHERE rev.parent_id = ?`;
      values = [userId];
    } else {
      return res.status(500).json({ msg: "Erreur lors de la récupération des tickets" });
    }

    const [results] = await db.query(query, values);
    res.status(200).json(results);
  } catch (error) {
    console.error("Erreur lors de la récupération des tickets :", error);
    return res.status(500).json({ msg: "Erreur lors de la récupération des tickets" });
  }
});

router.get('/api/tickets/export/excel', veritoken, checkRole([1, 2, 3]), async (req, res) => {
  const userId = req.userId;
  const roleId = req.roleId;
  const { 
    date_debut, 
    date_fin, 
    statut = 'active', 
    format = 'complet'
  } = req.query;

  try {
    const workbook = new ExcelJS.Workbook();
    
    workbook.creator = 'Geretonevent System';
    workbook.lastModifiedBy = 'Geretonevent System';
    workbook.created = new Date();
    workbook.modified = new Date();

    let ticketsData = [];
    let statsData = {};
    
    if (roleId === 1) {
      ticketsData = await getAdminTicketsData(date_debut, date_fin, statut);
      statsData = await getGlobalStats(date_debut, date_fin);
    } else if (roleId === 2) {
      ticketsData = await getCRPTicketsData(userId, date_debut, date_fin, statut);
      statsData = await getCRPStats(userId, date_debut, date_fin);
    } else if (roleId === 3) {
      ticketsData = await getGrossisteTicketsData(userId, date_debut, date_fin, statut);
      statsData = await getGrossisteStats(userId, date_debut, date_fin);
    }
    const summarySheet = workbook.addWorksheet('Résumé des Ventes');
    await createSummarySheet(summarySheet, statsData, roleId);

    if (format === 'complet') {
      const detailSheet = workbook.addWorksheet('Détails des Tickets');
      await createDetailSheet(detailSheet, ticketsData);
    }

    const statsSheet = workbook.addWorksheet('Statistiques');
    await createStatsSheet(statsSheet, statsData, date_debut, date_fin);

    const filename = `ventes_tickets_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Erreur lors de la génération du fichier Excel:", error);
    return res.status(500).json({ 
      msg: "Erreur lors de la génération du rapport Excel", 
      error: error.message 
    });
  }
});


async function getAdminTicketsData(dateDebut, dateFin, statut) {
    let whereConditions = [];
    let params = [];

    if (dateDebut) {
      whereConditions.push('t.date_activation >= ?');
      params.push(dateDebut);
    }
    if (dateFin) {
      whereConditions.push('t.date_activation <= ?');
      params.push(dateFin + ' 23:59:59');
    }
    if (statut) {
      whereConditions.push('t.statut = ?');
      params.push(statut);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const query = `
      SELECT 
        t.id,
        t.code_qr,
        t.statut,
        t.date_activation,
        rev.nom as revendeur_nom,
        rev.prenoms as revendeur_prenoms,
        rev.telephone as revendeur_tel,
        rev.cip as revendeur_cip,
        gros.nom as grossiste_nom,
        gros.prenoms as grossiste_prenoms,
        crp.nom as crp_nom,
        crp.prenoms as crp_prenoms,
        8000 as prix_unitaire
      FROM tickets t
      LEFT JOIN utilisateurs rev ON t.rev_id = rev.id
      LEFT JOIN utilisateurs gros ON t.gros_id = gros.id  
      LEFT JOIN utilisateurs crp ON t.crp_id = crp.id
      ${whereClause}
      ORDER BY t.date_activation DESC
    `;

    const [results] = await db.query(query, params);
    return results;
  }

  async function getCRPTicketsData(crpId, dateDebut, dateFin, statut) {
    let whereConditions = ['t.crp_id = ?'];
    let params = [crpId];

    if (dateDebut) {
      whereConditions.push('t.date_activation >= ?');
      params.push(dateDebut);
    }
    if (dateFin) {
      whereConditions.push('t.date_activation <= ?');
      params.push(dateFin + ' 23:59:59');
    }
    if (statut) {
      whereConditions.push('t.statut = ?');
      params.push(statut);
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    const query = `
      SELECT 
        t.id,
        t.code_qr,
        t.statut,
        t.date_activation,
        rev.nom as revendeur_nom,
        rev.prenoms as revendeur_prenoms,
        rev.telephone as revendeur_tel,
        rev.cip as revendeur_cip,
        gros.nom as grossiste_nom,
        gros.prenoms as grossiste_prenoms,
        8000 as prix_unitaire
      FROM tickets t
      LEFT JOIN utilisateurs rev ON t.rev_id = rev.id
      LEFT JOIN utilisateurs gros ON t.gros_id = gros.id
      ${whereClause}
      ORDER BY t.date_activation DESC
    `;

    const [results] = await db.query(query, params);
    return results;
  }

  async function getGrossisteTicketsData(grossisteId, dateDebut, dateFin, statut) {
    let whereConditions = ['t.gros_id = ?'];
    let params = [grossisteId];

    if (dateDebut) {
      whereConditions.push('t.date_activation >= ?');
      params.push(dateDebut);
    }
    if (dateFin) {
      whereConditions.push('t.date_activation <= ?');
      params.push(dateFin + ' 23:59:59');
    }
    if (statut) {
      whereConditions.push('t.statut = ?');
      params.push(statut);
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    const query = `
      SELECT 
        t.id,
        t.code_qr,
        t.statut,
        t.date_activation,
        rev.nom as revendeur_nom,
        rev.prenoms as revendeur_prenoms,
        rev.telephone as revendeur_tel,
        rev.cip as revendeur_cip,
        8000 as prix_unitaire
      FROM tickets t
      LEFT JOIN utilisateurs rev ON t.rev_id = rev.id
      ${whereClause}
      ORDER BY t.date_activation DESC
    `;

    const [results] = await db.query(query, params);
    return results;
  }

  async function getGlobalStats(dateDebut, dateFin) {
    let whereCondition = '';
    let params = [];

    if (dateDebut || dateFin) {
      let conditions = [];
      if (dateDebut) {
        conditions.push('t.date_activation >= ?');
        params.push(dateDebut);
      }
      if (dateFin) {
        conditions.push('t.date_activation <= ?');
        params.push(dateFin + ' 23:59:59');
      }
      whereCondition = 'WHERE ' + conditions.join(' AND ');
    }

    const query = `
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN t.statut = 'active' THEN 1 END) as tickets_actifs,
        COUNT(CASE WHEN t.statut = 'desactive' THEN 1 END) as tickets_desactives,
        SUM(CASE WHEN t.statut = 'active' THEN 8000 ELSE 0 END) as chiffre_affaires_total,
        COUNT(DISTINCT t.rev_id) as nb_revendeurs_actifs,
        COUNT(DISTINCT t.gros_id) as nb_grossistes_actifs,
        COUNT(DISTINCT t.crp_id) as nb_crp_actifs
      FROM tickets t
      ${whereCondition}
    `;

    const [results] = await db.query(query, params);
    return results[0];
  }

  async function getCRPStats(crpId, dateDebut, dateFin) {
    let whereCondition = 'WHERE t.crp_id = ?';
    let params = [crpId];

    if (dateDebut || dateFin) {
      if (dateDebut) {
        whereCondition += ' AND t.date_activation >= ?';
        params.push(dateDebut);
      }
      if (dateFin) {
        whereCondition += ' AND t.date_activation <= ?';
        params.push(dateFin + ' 23:59:59');
      }
    }

    const query = `
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN t.statut = 'active' THEN 1 END) as tickets_actifs,
        COUNT(CASE WHEN t.statut = 'desactive' THEN 1 END) as tickets_desactives,
        SUM(CASE WHEN t.statut = 'active' THEN 8000 ELSE 0 END) as chiffre_affaires_total,
        COUNT(DISTINCT t.rev_id) as nb_revendeurs_actifs,
        COUNT(DISTINCT t.gros_id) as nb_grossistes_actifs
      FROM tickets t
      ${whereCondition}
    `;

    const [results] = await db.query(query, params);
    return results[0];
  }

  async function getGrossisteStats(grossisteId, dateDebut, dateFin) {
    let whereCondition = 'WHERE t.gros_id = ?';
    let params = [grossisteId];

    if (dateDebut || dateFin) {
      if (dateDebut) {
        whereCondition += ' AND t.date_activation >= ?';
        params.push(dateDebut);
      }
      if (dateFin) {
        whereCondition += ' AND t.date_activation <= ?';
        params.push(dateFin + ' 23:59:59');
      }
    }

    const query = `
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN t.statut = 'active' THEN 1 END) as tickets_actifs,
        COUNT(CASE WHEN t.statut = 'desactive' THEN 1 END) as tickets_desactives,
        SUM(CASE WHEN t.statut = 'active' THEN 8000 ELSE 0 END) as chiffre_affaires_total,
        COUNT(DISTINCT t.rev_id) as nb_revendeurs_actifs
      FROM tickets t
      ${whereCondition}
    `;

    const [results] = await db.query(query, params);
    return results[0];
  }


  async function createSummarySheet(sheet, stats, roleId) {
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'RAPPORT DE VENTES - FESTICHILL';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('A2:F2');
    const dateCell = sheet.getCell('A2');
    dateCell.value = `Généré le: ${new Date().toLocaleString('fr-FR')}`;
    dateCell.font = { italic: true };
    dateCell.alignment = { horizontal: 'center' };

    sheet.getRow(3).height = 10;

    const headers = ['Métrique', 'Valeur'];
    const headerRow = sheet.getRow(4);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
      cell.alignment = { horizontal: 'center' };
    });

    const metriques = [
      ['Total des tickets', stats.total_tickets || 0],
      ['Tickets actifs', stats.tickets_actifs || 0],
      ['Tickets désactivés', stats.tickets_desactives || 0],
      ['Chiffre d\'affaires total', `${(stats.chiffre_affaires_total || 0).toLocaleString('fr-FR')} FCFA`],
      ['Nombre de revendeurs actifs', stats.nb_revendeurs_actifs || 0]
    ];

    if (roleId === 1) {
      metriques.push(['Nombre de grossistes actifs', stats.nb_grossistes_actifs || 0]);
      metriques.push(['Nombre de CRP actifs', stats.nb_crp_actifs || 0]);
    } else if (roleId === 2) {
      metriques.push(['Nombre de grossistes actifs', stats.nb_grossistes_actifs || 0]);
    }

    metriques.forEach((metrique, index) => {
      const row = sheet.getRow(5 + index);
      row.getCell(1).value = metrique[0];
      row.getCell(2).value = metrique[1];
      
      if (index % 2 === 0) {
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } };
        row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } };
      }
    });

    sheet.getColumn(1).width = 30;
    sheet.getColumn(2).width = 20;
  }

  async function createDetailSheet(sheet, ticketsData) {
    const headers = [
      'ID Ticket', 'Date d\'activation', 'Statut', 'Revendeur', 
      'Téléphone', 'CIP', 'Grossiste', 'CRP', 'Prix (FCFA)'
    ];

    const headerRow = sheet.getRow(1);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
      cell.alignment = { horizontal: 'center' };
    });

    ticketsData.forEach((ticket, index) => {
      const row = sheet.getRow(index + 2);
      row.getCell(1).value = ticket.id;
      row.getCell(2).value = new Date(ticket.date_activation).toLocaleString('fr-FR');
      row.getCell(3).value = ticket.statut;
      row.getCell(4).value = `${ticket.revendeur_nom || ''} ${ticket.revendeur_prenoms || ''}`.trim();
      row.getCell(5).value = ticket.revendeur_tel || '';
      row.getCell(6).value = ticket.revendeur_cip || '';
      row.getCell(7).value = `${ticket.grossiste_nom || ''} ${ticket.grossiste_prenoms || ''}`.trim();
      row.getCell(8).value = `${ticket.crp_nom || ''} ${ticket.crp_prenoms || ''}`.trim();
      row.getCell(9).value = ticket.prix_unitaire;

      if (index % 2 === 0) {
        for (let i = 1; i <= 9; i++) {
          row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F9FA' } };
        }
      }
    });

    sheet.columns.forEach(column => {
      column.width = 15;
    });
    sheet.getColumn(4).width = 25;
    sheet.getColumn(7).width = 25;
    sheet.getColumn(8).width = 25;
  }

  async function createStatsSheet(sheet, stats, dateDebut, dateFin) {
    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'STATISTIQUES DÉTAILLÉES';
    titleCell.font = { size: 14, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    if (dateDebut || dateFin) {
      sheet.mergeCells('A2:D2');
      const periodeCell = sheet.getCell('A2');
      periodeCell.value = `Période: ${dateDebut || 'Début'} - ${dateFin || 'Fin'}`;
      periodeCell.alignment = { horizontal: 'center' };
    }

    const startRow = 4;
    const statItems = [
      { label: 'Tickets Actifs', value: stats.tickets_actifs || 0, color: '70AD47' },
      { label: 'Tickets Désactivés', value: stats.tickets_desactives || 0, color: 'E74C3C' },
      { label: 'Revendeurs Actifs', value: stats.nb_revendeurs_actifs || 0, color: '3498DB' }
    ];

    statItems.forEach((item, index) => {
      const row = sheet.getRow(startRow + index);
      row.getCell(1).value = item.label;
      row.getCell(2).value = item.value;
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.color } };
      row.getCell(1).font = { color: { argb: 'FFFFFF' }, bold: true };
    });

    sheet.getColumn(1).width = 20;
    sheet.getColumn(2).width = 15;
  }

module.exports = router;
