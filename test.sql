-- Sélection de la base de données
USE festichill_db;

-- Ajout d'index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_tickets_statut ON tickets(statut);
CREATE INDEX IF NOT EXISTS idx_tickets_code_qr ON tickets(code_qr);
CREATE INDEX IF NOT EXISTS idx_tickets_rev_id ON tickets(rev_id);
CREATE INDEX IF NOT EXISTS idx_tickets_gros_id ON tickets(gros_id);
CREATE INDEX IF NOT EXISTS idx_tickets_crp_id ON tickets(crp_id);

-- Mode développement
SET @dev_mode = TRUE; -- Mettre à FALSE en production

-- Purge des données de test si en mode développement
DELETE FROM distributions WHERE @dev_mode = TRUE;
DELETE FROM tickets WHERE code_qr LIKE 'FESTICHILL-TEST%' AND @dev_mode = TRUE;
DELETE FROM utilisateurs WHERE role_id > 1 AND pseudo LIKE '%_test' AND @dev_mode = TRUE;

-- Insertion d'une catégorie de ticket
INSERT INTO categories_tickets (nom, prix_unitaire, description) 
VALUES ('Standard', 8000, 'Ticket standard pour le festival') 
ON DUPLICATE KEY UPDATE prix_unitaire = 8000;

INSERT INTO categories_tickets (nom, prix_unitaire, description) 
VALUES ('VIP', 30000, 'Ticket VIP pour le festival') 
ON DUPLICATE KEY UPDATE prix_unitaire = 30000;

insert  into utilisateurs (role_id, nom, prenoms, age, pseudo, email, telephone, mot_de_passe, cip, parent_id, est_actif, nb_tickets)  
values (1, 'Admin', 'Admin', 0, 'admin_test', 'admin_test@example.com', '0123456789',
    'admin1', 12345, NULL, TRUE, 0)
ON DUPLICATE KEY UPDATE pseudo = 'admin_test', nb_tickets = 0;

-- Insertion du CRP
INSERT INTO utilisateurs (role_id, nom, prenoms, age, pseudo, email, telephone, mot_de_passe, cip, parent_id, est_actif, nb_tickets, nb_vip)  
VALUES (2, 'DUPONT', 'Jean', 35, 'crp1', 'crp1@example.com', '0123456789',
        'admin1', 12345, 1, TRUE, 10000, 1000)
ON DUPLICATE KEY UPDATE pseudo = 'crp1', nb_tickets = 10000, nb_vip = 1000;

-- Récupération de l'ID du CRP
SET @crp_id = NULL;
SELECT id INTO @crp_id FROM utilisateurs WHERE pseudo = 'crp1';

-- Insertion des grossistes sous le CRP
INSERT INTO utilisateurs (role_id, nom, prenoms, age, pseudo, email, telephone, mot_de_passe, cip, parent_id, est_actif, nb_tickets)  
VALUES (3, 'Martin', 'Sophie', 28, 'grossiste1', 'grossiste1@example.com', '0234567890',
        'admin1', 23456, 
        @crp_id, TRUE, 0)
ON DUPLICATE KEY UPDATE pseudo = 'grossiste1', nb_tickets = 0;

INSERT INTO utilisateurs (role_id, nom, prenoms, age, pseudo, email, telephone, mot_de_passe, cip, parent_id, est_actif, nb_tickets)  
VALUES (3, 'Dubois', 'Pierre', 32, 'grossiste2', 'grossiste2@example.com', '0234567891',
        'admin1', 23457, 
        @crp_id, TRUE, 0)
ON DUPLICATE KEY UPDATE pseudo = 'grossiste2', nb_tickets = 0;

-- Récupération des IDs des grossistes
SET @gros1_id = NULL;
SET @gros2_id = NULL;
SELECT id INTO @gros1_id FROM utilisateurs WHERE pseudo = 'grossiste1';
SELECT id INTO @gros2_id FROM utilisateurs WHERE pseudo = 'grossiste2';

-- Insertion des revendeurs sous le premier grossiste
INSERT INTO utilisateurs (role_id, nom, prenoms, age, pseudo, email, telephone, mot_de_passe, cip, parent_id, est_actif, nb_tickets)  
VALUES (4, 'Petit', 'Marc', 25, 'vendeurs1', 'vendeurs1@example.com', '0345678901',
        'admin1', 34567, 
        @gros1_id, TRUE, 0)
ON DUPLICATE KEY UPDATE pseudo = 'vendeurs1', nb_tickets = 0;

INSERT INTO utilisateurs (role_id, nom, prenoms, age, pseudo, email, telephone, mot_de_passe, cip, parent_id, est_actif, nb_tickets)  
VALUES (4, 'Leroy', 'Julie', 26, 'vendeurs2', 'vendeurs2@example.com', '0345678902',
        'admin1', 34568, 
        @gros1_id, TRUE, 0)
ON DUPLICATE KEY UPDATE pseudo = 'vendeurs2', nb_tickets = 0;

-- Insertion des revendeurs sous le deuxième grossiste
INSERT INTO utilisateurs (role_id, nom, prenoms, age, pseudo, email, telephone, mot_de_passe, cip, parent_id, est_actif, nb_tickets)  
VALUES (4, 'Moreau', 'Thomas', 29, 'vendeurs3', 'vendeurs3@example.com', '0345678903',
        'admin1', 34569, 
        @gros2_id, TRUE, 0)
ON DUPLICATE KEY UPDATE pseudo = 'vendeurs3', nb_tickets = 0;

-- Récupération de l'ID du revendeur
SET @rev1_id = NULL;
SELECT id INTO @rev1_id FROM utilisateurs WHERE pseudo = 'vendeurs1';


-- -- Génération de tickets pour test
-- INSERT INTO tickets (code_qr, statut) VALUES 
-- ('FESTICHILL-TEST-001', 'non_enregistre'),
-- ('FESTICHILL-TEST-002', 'non_enregistre'),
-- ('FESTICHILL-TEST-003', 'non_enregistre'),
-- ('FESTICHILL-TEST-004', 'non_enregistre'),
-- ('FESTICHILL-TEST-005', 'non_enregistre'),
-- ('FESTICHILL-TEST-006', 'non_enregistre'),
-- ('FESTICHILL-TEST-007', 'non_enregistre'),
-- ('FESTICHILL-TEST-008', 'non_enregistre'),
-- ('FESTICHILL-TEST-009', 'non_enregistre'),
-- ('FESTICHILL-TEST-010', 'non_enregistre')
-- ON DUPLICATE KEY UPDATE statut = 'non_enregistre';

-- -- Attribution des tickets au CRP
-- UPDATE tickets 
-- SET crp_id = @crp_id 
-- WHERE code_qr IN ('FESTICHILL-TEST-001', 'FESTICHILL-TEST-002', 'FESTICHILL-TEST-003', 'FESTICHILL-TEST-004');

-- -- Attribution des tickets aux grossistes
-- UPDATE tickets 
-- SET gros_id = @gros1_id
-- WHERE code_qr IN ('FESTICHILL-TEST-001', 'FESTICHILL-TEST-002');

-- UPDATE tickets 
-- SET gros_id = @gros2_id
-- WHERE code_qr IN ('FESTICHILL-TEST-003');

-- UPDATE tickets 
-- SET rev_id = @rev1_id
-- WHERE code_qr IN ('FESTICHILL-TEST-001');

-- -- Vérifier que toutes les variables sont bien définies avant d'insérer
-- SELECT @crp_id AS crp_id, @gros1_id AS gros1_id, @gros2_id AS gros2_id, @rev1_id AS rev1_id;

-- INSERT INTO tickets (code_qr, statut, proprietaire_id, date_activation, rev_id)
-- VALUES ('FESTICHILL-TEST-ACTIF-001', 'active', 
--         @rev1_id,
--         NOW(), 
--         @rev1_id)
-- ON DUPLICATE KEY UPDATE statut = 'active';

-- INSERT INTO tickets (code_qr, statut, proprietaire_id, date_activation, rev_id)
-- VALUES ('FESTICHILL-TEST-DESACTIVE-001', 'desactive', 
--         @rev1_id,
--         DATE_SUB(NOW(), INTERVAL 1 DAY), 
--         @rev1_id)
-- ON DUPLICATE KEY UPDATE statut = 'desactive';

-- -- S'assurer que tous les IDs ne sont pas NULL avant d'insérer dans distributions
-- -- Ajout de vérifications pour éviter les insertions de valeurs NULL
-- INSERT INTO distributions (donneur_id, receveur_id, nombre_tickets, date_distribution)
-- SELECT 
--     (SELECT id FROM utilisateurs WHERE role_id = 1 LIMIT 1), 
--     @crp_id,
--     4, 
--     NOW()
-- WHERE @crp_id IS NOT NULL;

-- INSERT INTO distributions (donneur_id, receveur_id, nombre_tickets, date_distribution)
-- SELECT 
--     @crp_id, 
--     @gros1_id,
--     2, 
--     NOW()
-- WHERE @crp_id IS NOT NULL AND @gros1_id IS NOT NULL;

-- INSERT INTO distributions (donneur_id, receveur_id, nombre_tickets, date_distribution)
-- SELECT 
--     @crp_id, 
--     @gros2_id,
--     1, 
--     NOW()
-- WHERE @crp_id IS NOT NULL AND @gros2_id IS NOT NULL;

-- INSERT INTO distributions (donneur_id, receveur_id, nombre_tickets, date_distribution)
-- SELECT 
--     @gros1_id, 
--     @rev1_id,
--     1, 
--     NOW()
-- WHERE @gros1_id IS NOT NULL AND @rev1_id IS NOT NULL;

-- UPDATE utilisateurs 
-- SET nb_tickets = 2
-- WHERE pseudo = 'crp1';

-- UPDATE utilisateurs 
-- SET nb_tickets = 1
-- WHERE pseudo = 'grossiste1';

-- UPDATE utilisateurs 
-- SET nb_tickets = 1
-- WHERE pseudo = 'grossiste2';

-- UPDATE utilisateurs 
-- SET nb_tickets = 3
-- WHERE pseudo = 'vendeurs1';

-- SELECT 'Nombre d\'utilisateurs de test créés:' as Info, COUNT(*) as Valeur FROM utilisateurs WHERE pseudo LIKE '%_test';
-- SELECT 'Nombre de tickets créés:' as Info, COUNT(*) as Valeur FROM tickets WHERE code_qr LIKE 'FESTICHILL-TEST%';
-- SELECT 'Nombre de distributions créées:' as Info, COUNT(*) as Valeur FROM distributions;
