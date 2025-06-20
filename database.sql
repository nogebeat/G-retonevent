CREATE DATABASE IF NOT EXISTS geretoi_db;
USE geretoi_db;

CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE utilisateurs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_id INT NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenoms VARCHAR(100) NOT NULL,
    age INT,
    pseudo VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    photo_profil VARCHAR(255),
    cip INT NOT NULL, 
    parent_id INT NULL,
    est_actif BOOLEAN DEFAULT FALSE,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    nb_vip INT DEFAULT 0,
    nb_vip_ven INT DEFAULT 0,
    nb_vip_reçu INT DEFAULT 0,
    nb_tickets INT DEFAULT 0,
    nb_tickets_ven INT DEFAULT 0,
    nb_tickets_reçu INT DEFAULT 0,
    statut ENUM('non_assigné', 'RP-Ancien', 'RP-Nouveau', 'Partenaire') DEFAULT 'non_assigné',
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (parent_id) REFERENCES utilisateurs(id) ON DELETE SET NULL
);

CREATE TABLE categories_tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    prix_unitaire DECIMAL(10, 2) NOT NULL,
    UNIQUE (nom)
);

CREATE TABLE tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code_qr VARCHAR(255) UNIQUE NOT NULL,
    statut ENUM('non_enregistre', 'active', 'desactive') DEFAULT 'non_enregistre',
    proprietaire_id INT NULL,
    date_activation DATETIME DEFAULT CURRENT_TIMESTAMP,
    rev_id INT NULL,
    gros_id INT NULL,
    crp_id INT NULL,
    FOREIGN KEY (rev_id) REFERENCES utilisateurs(id),
    FOREIGN KEY (gros_id) REFERENCES utilisateurs(id),
    FOREIGN KEY (crp_id) REFERENCES utilisateurs(id)
);

CREATE TABLE vip_tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code_qr VARCHAR(255) UNIQUE NOT NULL,
    statut ENUM('non_enregistre', 'active', 'desactive') DEFAULT 'non_enregistre',
    proprietaire_id INT NULL,
    date_activation DATETIME DEFAULT CURRENT_TIMESTAMP,
    rev_id INT NULL,
    gros_id INT NULL,
    crp_id INT NULL,
    FOREIGN KEY (rev_id) REFERENCES utilisateurs(id),
    FOREIGN KEY (gros_id) REFERENCES utilisateurs(id),
    FOREIGN KEY (crp_id) REFERENCES utilisateurs(id)
);

CREATE TABLE distributions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    donneur_id INT NOT NULL,
    receveur_id INT NOT NULL,
    nombre_tickets INT NOT NULL,
    confir BOOLEAN DEFAULT FALSE,
    date_distribution DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donneur_id) REFERENCES utilisateurs(id),
    FOREIGN KEY (receveur_id) REFERENCES utilisateurs(id)
);

CREATE TABLE distributions_vip (
    id INT PRIMARY KEY AUTO_INCREMENT,
    donneur_id INT NOT NULL,
    receveur_id INT NOT NULL,
    nombre_tickets INT NOT NULL,
    confir BOOLEAN DEFAULT FALSE,
    date_distribution DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donneur_id) REFERENCES utilisateurs(id),
    FOREIGN KEY (receveur_id) REFERENCES utilisateurs(id)
);

CREATE TABLE invitation_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    token VARCHAR(255) UNIQUE NOT NULL,
    parent_id INT NOT NULL,
    role_id INT NOT NULL,
    expires_at DATETIME NOT NULL,
    used INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    expediteur_id INT NOT NULL,
    destinataire_id INT NOT NULL,
    type ENUM('distribution_tickets', 'distribution_vip', 'message', 'alerte', 'autre') NOT NULL,
    titre VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    donnees_json JSON NULL,
    lu BOOLEAN DEFAULT FALSE,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_lecture DATETIME NULL,
    FOREIGN KEY (expediteur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    FOREIGN KEY (destinataire_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    INDEX idx_destinataire_lu (destinataire_id, lu),
    INDEX idx_date_creation (date_creation)
);

CREATE TABLE password_reset_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);

INSERT INTO roles (nom, description) VALUES 
('admin', 'Administrateur système avec accès complet'),
('crp', 'Super grossiste (CRP)'),
('grossiste', 'Grossiste de tickets'),
('revendeur', 'Revendeur de tickets');

INSERT INTO categories_tickets (nom, description, prix_unitaire) VALUES
('Standard', 'Ticket standard pour le geretoi', 8000.00);
