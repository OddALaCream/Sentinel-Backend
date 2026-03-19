const { createClient } = require('@supabase/supabase-js');

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY
} = process.env;

const missingVariables = [
  ['SUPABASE_URL', SUPABASE_URL],
  ['SUPABASE_ANON_KEY', SUPABASE_ANON_KEY],
  ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY]
].filter(([, value]) => !value);

if (missingVariables.length > 0) {
  throw new Error(
    `Faltan variables de entorno requeridas: ${missingVariables
      .map(([name]) => name)
      .join(', ')}`
  );
}

const sharedOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, sharedOptions);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, sharedOptions);

const createUserClient = (accessToken) =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...sharedOptions,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });

module.exports = {
  supabase,
  supabaseAdmin,
  createUserClient
};
