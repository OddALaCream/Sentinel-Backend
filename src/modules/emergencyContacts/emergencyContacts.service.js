const { createUserClient } = require('../../config/supabaseClient');
const ApiError = require('../../utils/apiError');
const { isNoRowsError, throwSupabaseError } = require('../../utils/supabase');
const { getRequiredProfile } = require('../profiles/profiles.service');
const { logAction } = require('../auditLogs/auditLogs.service');

const resolveContext = async (clientOrParams, maybeAuthUserId) => {
  if (clientOrParams && typeof clientOrParams.from === 'function') {
    const profile = await getRequiredProfile(clientOrParams, maybeAuthUserId);
    return {
      client: clientOrParams,
      profile
    };
  }

  return {
    client: createUserClient(clientOrParams.accessToken),
    profile: { id: clientOrParams.profileId }
  };
};

const getOwnedContact = async (client, profileId, contactId) => {
  const { data, error } = await client
    .from('emergency_contacts')
    .select('*')
    .eq('id', contactId)
    .eq('user_id', profileId)
    .maybeSingle();

  if (error && !isNoRowsError(error)) {
    throwSupabaseError(error, 'No se pudo consultar el contacto');
  }

  if (!data) {
    throw new ApiError(404, 'Contacto no encontrado');
  }

  return data;
};

const listContacts = async (clientOrParams, maybeAuthUserId) => {
  const { client, profile } = await resolveContext(clientOrParams, maybeAuthUserId);
  const { data, error } = await client
    .from('emergency_contacts')
    .select('*')
    .eq('user_id', profile.id)
    .order('prioridad', { ascending: true })
    .order('created_at', { ascending: false });

  throwSupabaseError(error, 'No se pudieron listar los contactos');

  return data;
};

const getContactById = async (clientOrParams, maybeAuthUserId, maybeContactId) => {
  const { client, profile } = await resolveContext(clientOrParams, maybeAuthUserId);
  const contactId =
    clientOrParams && typeof clientOrParams.from === 'function'
      ? maybeContactId
      : clientOrParams.contactId;
  return getOwnedContact(client, profile.id, contactId);
};

const createContact = async (clientOrParams, maybeAuthUserId, maybePayload) => {
  const { client, profile } = await resolveContext(clientOrParams, maybeAuthUserId);
  const payload = clientOrParams && typeof clientOrParams.from === 'function' ? maybePayload : clientOrParams.payload;
  const { data, error } = await client
    .from('emergency_contacts')
    .insert({
      user_id: profile.id,
      nombre_completo: payload.nombre_completo,
      parentesco: payload.parentesco ?? null,
      telefono: payload.telefono,
      telefono_alternativo: payload.telefono_alternativo ?? null,
      prioridad: payload.prioridad ?? 1,
      puede_recibir_alertas: payload.puede_recibir_alertas ?? true
    })
    .select('*')
    .single();

  throwSupabaseError(error, 'No se pudo crear el contacto de emergencia');

  await logAction({
    user_id: profile.id,
    action: 'create_contact',
    entity_type: 'emergency_contact',
    entity_id: data.id,
    description: `Se creo el contacto de emergencia ${data.nombre_completo}`
  });

  return data;
};

const updateContact = async (clientOrParams, maybeAuthUserId, maybeContactId, maybePayload) => {
  const { client, profile } = await resolveContext(clientOrParams, maybeAuthUserId);
  const contactId =
    clientOrParams && typeof clientOrParams.from === 'function'
      ? maybeContactId
      : clientOrParams.contactId;
  const payload =
    clientOrParams && typeof clientOrParams.from === 'function' ? maybePayload : clientOrParams.payload;

  await getOwnedContact(client, profile.id, contactId);

  const { data, error } = await client
    .from('emergency_contacts')
    .update(payload)
    .eq('id', contactId)
    .eq('user_id', profile.id)
    .select('*')
    .single();

  throwSupabaseError(error, 'No se pudo actualizar el contacto');

  return data;
};

const deleteContact = async (clientOrParams, maybeAuthUserId, maybeContactId) => {
  const { client, profile } = await resolveContext(clientOrParams, maybeAuthUserId);
  const contactId =
    clientOrParams && typeof clientOrParams.from === 'function'
      ? maybeContactId
      : clientOrParams.contactId;
  const existingContact = await getOwnedContact(client, profile.id, contactId);

  const { error } = await client
    .from('emergency_contacts')
    .delete()
    .eq('id', contactId)
    .eq('user_id', profile.id);

  throwSupabaseError(error, 'No se pudo eliminar el contacto');

  return {
    id: existingContact.id
  };
};

module.exports = {
  listContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  getOwnedContact
};
