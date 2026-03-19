const ApiError = require('../../utils/apiError');
const { supabase } = require('../../config/supabaseClient');

const formatAuthPayload = (authResponse) => {
  const { user, session } = authResponse;

  return {
    user: user
      ? {
          id: user.id,
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          last_sign_in_at: user.last_sign_in_at
        }
      : null,
    session: session
      ? {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
          expires_at: session.expires_at,
          token_type: session.token_type
        }
      : null
  };
};

const register = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    throw new ApiError(400, error.message || 'No se pudo registrar el usuario');
  }

  return formatAuthPayload(data);
};

const login = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new ApiError(401, error.message || 'Credenciales invalidas');
  }

  return formatAuthPayload(data);
};

module.exports = {
  register,
  login
};
