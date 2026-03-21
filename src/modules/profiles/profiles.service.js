const { createUserClient } = require('../../config/supabaseClient');
const ApiError = require('../../utils/apiError');
const {
  isNoRowsError,
  throwSupabaseError,
  executeUpdateWithOptionalUpdatedAt
} = require('../../utils/supabase');
const { logAction } = require('../auditLogs/auditLogs.service');

const resolveClient = (clientOrParams) => {
  if (clientOrParams && typeof clientOrParams.from === 'function') {
    return clientOrParams;
  }

  if (clientOrParams && clientOrParams.accessToken) {
    return createUserClient(clientOrParams.accessToken);
  }

  throw new ApiError(500, 'No se pudo resolver el cliente de Supabase');
};

const getProfileByAuthUserId = async (clientOrParams, maybeAuthUserId) => {
  const userClient = resolveClient(clientOrParams);
  const authUserId =
    typeof maybeAuthUserId === 'string' ? maybeAuthUserId : clientOrParams.authUserId;
  const { data, error } = await userClient
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error && !isNoRowsError(error)) {
    throwSupabaseError(error, 'No se pudo consultar el perfil del usuario');
  }

  return data || null;
};

const getRequiredProfile = async (clientOrParams, maybeAuthUserId) => {
  const profile = await getProfileByAuthUserId(clientOrParams, maybeAuthUserId);

  if (!profile) {
    throw new ApiError(404, 'Perfil no encontrado. Primero crea tu perfil');
  }

  return profile;
};

const createProfile = async (clientOrParams, maybeAuthUser, maybePayload) => {
  const isNewSignature = clientOrParams && typeof clientOrParams.from === 'function';
  const userClient = resolveClient(clientOrParams);
  const authUser = isNewSignature
    ? maybeAuthUser
    : {
        id: clientOrParams.authUserId,
        email: clientOrParams.fallbackEmail || null
      };
  const payload = isNewSignature ? maybePayload : clientOrParams.payload;
  const existingProfile = await getProfileByAuthUserId(userClient, authUser.id);

  if (existingProfile) {
    throw new ApiError(409, 'El usuario autenticado ya tiene un perfil creado');
  }

  const { data, error } = await userClient
    .from('profiles')
    .insert({
      auth_user_id: authUser.id,
      nombre: payload.nombre,
      apellido_p: payload.apellido_p,
      apellido_m: payload.apellido_m ?? null,
      fecha_nacimiento: payload.fecha_nacimiento ?? null,
      telefono: payload.telefono ?? null,
      email: payload.email || authUser.email || null,
      direccion_opcional: payload.direccion_opcional ?? null
    })
    .select('*')
    .single();

  throwSupabaseError(error, 'No se pudo crear el perfil');

  await logAction({
    user_id: data.id,
    action: 'create_profile',
    entity_type: 'profile',
    entity_id: data.id,
    description: 'El usuario creo su perfil'
  });

  return data;
};

const getMyProfile = async (client, authUserId) => getRequiredProfile(client, authUserId);

const updateMyProfile = async (clientOrParams, maybeAuthUserId, maybePayload) => {
  const isNewSignature = clientOrParams && typeof clientOrParams.from === 'function';
  const userClient = resolveClient(clientOrParams);
  const authUserId = isNewSignature ? maybeAuthUserId : clientOrParams.authUserId;
  const payload = isNewSignature ? maybePayload : clientOrParams.payload;
  const currentProfile = await getRequiredProfile(userClient, authUserId);

  const { data, error } = await executeUpdateWithOptionalUpdatedAt(({ includeUpdatedAt }) => {
    const updates = { ...payload };

    if (includeUpdatedAt) {
      updates.updated_at = new Date().toISOString();
    }

    return userClient.from('profiles').update(updates).eq('id', currentProfile.id).select('*').single();
  });

  throwSupabaseError(error, 'No se pudo actualizar el perfil');

  await logAction({
    user_id: currentProfile.id,
    action: 'update_profile',
    entity_type: 'profile',
    entity_id: currentProfile.id,
    description: 'El usuario actualizo su perfil'
  });

  return data;
};

module.exports = {
  getProfileByAuthUserId,
  getRequiredProfile,
  createProfile,
  getMyProfile,
  updateMyProfile,
  updateProfile: updateMyProfile
};
