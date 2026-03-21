const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { supabase } = require('./config/supabaseClient');

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

// Diagnostic endpoint
app.get('/diagnose', async (req, res) => {
  const diagnostics = {
    server: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    },
    supabase: {
      url: process.env.SUPABASE_URL ? '✅ Configured' : '❌ Missing',
      anonKey: process.env.SUPABASE_ANON_KEY ? '✅ Configured' : '❌ Missing',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configured' : '❌ Missing'
    },
    connectivity: {
      testTime: new Date().toISOString()
    },
    errors: []
  };

  // Test Supabase connection
  try {
    const { data, error: err } = await supabase.auth.getSession();

    if (err) {
      diagnostics.connectivity.supabase = `❌ Error: ${err.message || JSON.stringify(err)}`;
      diagnostics.errors.push({
        type: 'Supabase Auth Connection',
        message: err.message || JSON.stringify(err),
        details: err
      });
    } else {
      diagnostics.connectivity.supabase = '✅ Connected';
    }
  } catch (err) {
    diagnostics.connectivity.supabase = `❌ Exception: ${err.message}`;
    diagnostics.errors.push({
      type: 'Supabase Exception',
      message: err.message,
      stack: err.stack?.split('\n').slice(0, 3).join('\n')
    });
  }

  // Check environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  diagnostics.environment = {
    allConfigured: requiredEnvVars.every(v => process.env[v]),
    missing: requiredEnvVars.filter(v => !process.env[v])
  };

  // Return diagnostic info
  const statusCode = diagnostics.errors.length === 0 ? 200 : 503;
  res.status(statusCode).json({
    success: diagnostics.errors.length === 0,
    message: diagnostics.errors.length === 0 ? 'All systems operational' : 'Issues detected',
    diagnostics
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
