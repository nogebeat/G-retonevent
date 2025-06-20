const express = require('express');
const fs = require('fs');
const app = express();
const path = require('path');

const authroutes = require('./routes/auth/auth');
const userroutes = require('./routes/user/user');
const userqueryroutes = require('./routes/user/user-query');
const ticketsroutes = require('./routes/tickets/tickets');
const vipticketsroutes = require('./routes/vip-tickets/vip-tickets');
const notificationsroutes = require('./routes/notif/notif');
// const ticketsqueryroutes = require('./routes/tickets/tickets-query');

app.use(authroutes);
app.use(userroutes);
app.use(userqueryroutes);
app.use(ticketsroutes);
app.use(vipticketsroutes);
app.use(notificationsroutes);
// app.use(mailer);
// app.use(ticketsqueryroutes);

module.exports = app;