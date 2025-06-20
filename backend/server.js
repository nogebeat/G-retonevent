const express = require('express');
const fs = require('fs');
const app = express();
const db = require('./config/db');
require('dotenv').config();
const path = require('path');
const serv = require('./path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

// Configuration de CORS pour autoriser les cookies
app.use(cors({
  origin: (origin, callback) => { 
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parser les cookies
app.use(cookieParser());

// Parser le JSON
// app.use((req, res, next) => {
//   const contentType = req.headers['content-type'] || '';
//   if (contentType.includes('multipart/form-data')) return next();
//   express.json()(req, res, next);
// });

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use(serv);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware 404 pour les routes non trouvées
const notFound = require('./Middleware/notFound');
app.use(notFound);

// Démarrer le serveur
app.listen(process.env.PORT, () => {
  console.log(`Le Serveur tourne sur port : ${process.env.PORT}`);
});