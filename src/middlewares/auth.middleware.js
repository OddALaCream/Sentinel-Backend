const { supabase, createUserClient } = require('../config/supabaseClient');
const ApiError = require('../utils/apiError');
const profilesService = require('../modules/profiles/profiles.service');

const authMiddleware = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) {
      throw new ApiError(401, 'No se envio el header Authorization');
    }

    const [scheme, token] = authorizationHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'El token debe enviarse como Bearer <token>');
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new ApiError(401, 'Token invalido o expirado');
    }

    req.accessToken = token;
    req.authUser = data.user;
    req.supabase = createUserClient(token);

    return next();
  } catch (error) {
    return next(error);
  }
};

const requireProfile = async (req, res, next) => {
  try {
    const profile = await profilesService.getProfileByAuthUserId(req.supabase, req.authUser.id);

    if (!profile) {
      throw new ApiError(404, 'Perfil no encontrado. Primero crea tu perfil');
    }

    req.profile = profile;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = authMiddleware;
module.exports.requireAuth = authMiddleware;
module.exports.requireProfile = requireProfile;
