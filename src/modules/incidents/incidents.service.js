const { createUserClient } = require('../../config/supabaseClient');
const ApiError = require('../../utils/apiError');
const { executeUpdateWithOptionalUpdatedAt } = require('../../utils/supabase');
const { retrySupabaseOperation } = require('../../utils/retryHandler');

const mapIncidentPayload = (payload) => ({
  titulo: payload.titulo,
  descripcion: payload.descripcion ?? null,
  tipo_incidente: payload.tipo_incidente,
  fecha_incidente: payload.fecha_incidente ?? null,
  lugar: payload.lugar ?? null,
  nivel_riesgo: payload.nivel_riesgo ?? 'medio',
  estado: payload.estado ?? 'borrador'
});

const getIncidentByIdOrThrow = async ({ accessToken, profileId, incidentId }) => {
  const userClient = createUserClient(accessToken);
  const { data, error } = await userClient
    .from('incidents')
    .select('*')
    .eq('id', incidentId)
    .eq('user_id', profileId)
    .maybeSingle();

  if (error) {
    throw ApiError.internal('Failed to fetch incident', error.message);
  }

  if (!data) {
    throw ApiError.notFound('Incident not found');
  }

  return data;
};

const createIncident = async ({ accessToken, profileId, payload }) => {
  const userClient = createUserClient(accessToken);
  const { data, error } = await userClient
    .from('incidents')
    .insert({
      user_id: profileId,
      ...mapIncidentPayload(payload)
    })
    .select('*')
    .single();

  if (error) {
    throw ApiError.badRequest(error.message);
  }

  return data;
};

const listIncidents = async ({ accessToken, profileId }) => {
  const userClient = createUserClient(accessToken);
  const { data, error } = await userClient
    .from('incidents')
    .select('*')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false });

  if (error) {
    throw ApiError.internal('Failed to fetch incidents', error.message);
  }

  return data;
};

const updateIncident = async ({ accessToken, profileId, incidentId, payload }) => {
  const userClient = createUserClient(accessToken);
  const updates = {};

  [
    'titulo',
    'descripcion',
    'tipo_incidente',
    'fecha_incidente',
    'lugar',
    'nivel_riesgo',
    'estado'
  ].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      updates[field] = payload[field];
    }
  });

  const { data, error } = await retrySupabaseOperation(
    () =>
      executeUpdateWithOptionalUpdatedAt(({ includeUpdatedAt }) => {
        const safeUpdates = { ...updates };

        if (includeUpdatedAt) {
          safeUpdates.updated_at = new Date().toISOString();
        }

        return userClient
          .from('incidents')
          .update(safeUpdates)
          .eq('id', incidentId)
          .eq('user_id', profileId)
          .select('*')
          .maybeSingle();
      }),
    3 // maxRetries
  );

  if (error) {
    throw ApiError.badRequest(error.message);
  }

  if (!data) {
    throw ApiError.notFound('Incident not found');
  }

  return data;
};

const deleteIncident = async ({ accessToken, profileId, incidentId }) => {
  const userClient = createUserClient(accessToken);
  const { data, error } = await retrySupabaseOperation(
    () =>
      userClient
        .from('incidents')
        .delete()
        .eq('id', incidentId)
        .eq('user_id', profileId)
        .select('*')
        .maybeSingle(),
    3 // maxRetries
  );

  if (error) {
    throw ApiError.badRequest(error.message);
  }

  if (!data) {
    throw ApiError.notFound('Incident not found');
  }

  return data;
};

const ensureOwnedContact = async ({ accessToken, profileId, contactId }) => {
  const userClient = createUserClient(accessToken);
  const { data, error } = await userClient
    .from('emergency_contacts')
    .select('*')
    .eq('id', contactId)
    .eq('user_id', profileId)
    .maybeSingle();

  if (error) {
    throw ApiError.internal('Failed to validate contact ownership', error.message);
  }

  if (!data) {
    throw ApiError.notFound('Emergency contact not found');
  }

  return data;
};

const linkContactToIncident = async ({ accessToken, profileId, incidentId, contactId, role }) => {
  await getIncidentByIdOrThrow({ accessToken, profileId, incidentId });
  await ensureOwnedContact({ accessToken, profileId, contactId });

  const userClient = createUserClient(accessToken);
  const { data, error } = await userClient
    .from('incident_contact_links')
    .insert({
      incident_id: incidentId,
      emergency_contact_id: contactId,
      rol: role ?? null
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw ApiError.conflict('This contact is already linked to the incident');
    }

    throw ApiError.badRequest(error.message);
  }

  return data;
};

const listIncidentContacts = async ({ accessToken, profileId, incidentId }) => {
  await getIncidentByIdOrThrow({ accessToken, profileId, incidentId });

  const userClient = createUserClient(accessToken);
  const { data: links, error: linksError } = await userClient
    .from('incident_contact_links')
    .select('id, emergency_contact_id, rol, created_at')
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false });

  if (linksError) {
    throw ApiError.internal('Failed to fetch incident contact links', linksError.message);
  }

  if (links.length === 0) {
    return [];
  }

  const contactIds = links.map((link) => link.emergency_contact_id);
  const { data: contacts, error: contactsError } = await userClient
    .from('emergency_contacts')
    .select('*')
    .in('id', contactIds);

  if (contactsError) {
    throw ApiError.internal('Failed to fetch incident contacts', contactsError.message);
  }

  const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));

  return links.map((link) => ({
    id: link.id,
    incident_id: incidentId,
    rol: link.rol,
    created_at: link.created_at,
    contact: contactsById.get(link.emergency_contact_id) || null
  }));
};

const unlinkContactFromIncident = async ({ accessToken, profileId, incidentId, contactId }) => {
  await getIncidentByIdOrThrow({ accessToken, profileId, incidentId });
  await ensureOwnedContact({ accessToken, profileId, contactId });

  const userClient = createUserClient(accessToken);
  const { data, error } = await userClient
    .from('incident_contact_links')
    .delete()
    .eq('incident_id', incidentId)
    .eq('emergency_contact_id', contactId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw ApiError.badRequest(error.message);
  }

  if (!data) {
    throw ApiError.notFound('Incident-contact link not found');
  }

  return data;
};

module.exports = {
  getIncidentByIdOrThrow,
  createIncident,
  listIncidents,
  updateIncident,
  deleteIncident,
  linkContactToIncident,
  listIncidentContacts,
  unlinkContactFromIncident
};
