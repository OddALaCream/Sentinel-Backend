const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./modules/auth/auth.routes');
const profileRoutes = require('./modules/profiles/profiles.routes');
const emergencyContactsRoutes = require('./modules/emergencyContacts/emergencyContacts.routes');
const incidentsRoutes = require('./modules/incidents/incidents.routes');
const evidencesRoutes = require('./modules/evidences/evidences.routes');
const audioMetadataRoutes = require('./modules/audioMetadata/audioMetadata.routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Servidor operativo',
    data: {
      uptime: process.uptime()
    }
  });
});

app.use('/auth', authRoutes);
app.use('/profiles', profileRoutes);
app.use('/contacts', emergencyContactsRoutes);
app.use('/incidents', incidentsRoutes);
app.use('/', evidencesRoutes);
app.use('/', audioMetadataRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
