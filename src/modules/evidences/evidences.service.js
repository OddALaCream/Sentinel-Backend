const crypto = require('crypto');
const path = require('path');
const { createUserClient, supabaseAdmin } = require('../../config/supabaseClient');
const ApiError = require('../../utils/apiError');
const incidentsService = require('../incidents/incidents.service');

const EVIDENCE_BUCKET = 'evidences';

const documentMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'application/rtf',
  'text/rtf',
  'text/plain'
]);

const inferEvidenceType = (mimeType) => {
  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }

  if (mimeType.startsWith('image/')) {
    return 'imagen';
  }

  if (mimeType.startsWith('video/')) {
    return 'video';
  }

  if (mimeType === 'text/plain') {
    return 'texto';
  }

  if (documentMimeTypes.has(mimeType)) {
    return 'documento';
  }

  return null;
};

const sanitizeFilename = (filename) =>
  path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');

const buildStoragePath = ({ authUserId, originalName }) => {
  const safeName = sanitizeFilename(originalName);
  return `${authUserId}/evidences/${Date.now()}-${safeName}`;
};

const calculateSha256 = (buffer) =>
  crypto.createHash('sha256').update(buffer).digest('hex');

const ensureOwnedIncidentIfProvided = async ({ accessToken, profileId, incidentId }) => {
  if (!incidentId) {
    return null;
  }

  return incidentsService.getIncidentByIdOrThrow({ accessToken, profileId, incidentId });
};

const getEvidenceRecordByIdOrThrow = async ({ accessToken, profileId, evidenceId }) => {
  const userClient = createUserClient(accessToken);
  const { data, error } = await userClient
    .from('evidences')
    .select('*')
    .eq('id', evidenceId)
    .eq('user_id', profileId)
    .maybeSingle();

  if (error) {
    throw ApiError.internal('Failed to fetch evidence', error.message);
  }

  if (!data) {
    throw ApiError.notFound('Evidence not found');
  }

  return data;
};

const getEvidenceByIdOrThrow = async ({ accessToken, profileId, evidenceId }) => {
  const data = await getEvidenceRecordByIdOrThrow({ accessToken, profileId, evidenceId });

  const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(data.storage_path, 60 * 15);

  if (signedUrlError) {
    throw ApiError.internal('Failed to generate signed URL', signedUrlError.message);
  }

  return {
    ...data,
    signed_url: signedUrlData.signedUrl,
    signed_url_expires_in: 900
  };
};

const createEvidence = async ({
  accessToken,
  authUserId,
  profileId,
  incidentId,
  file,
  payload
}) => {
  await ensureOwnedIncidentIfProvided({ accessToken, profileId, incidentId });

  if (!file) {
    throw ApiError.badRequest('File is required');
  }

  const inferredType = inferEvidenceType(file.mimetype);

  if (!inferredType) {
    throw ApiError.badRequest('Unable to determine evidence type from MIME type');
  }

  if (payload.tipo_evidencia && payload.tipo_evidencia !== inferredType) {
    throw ApiError.badRequest(
      `tipo_evidencia does not match uploaded file type. Expected "${inferredType}".`
    );
  }

  const storagePath = buildStoragePath({
    authUserId,
    originalName: file.originalname
  });

  const { error: storageError } = await supabaseAdmin.storage
    .from(EVIDENCE_BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (storageError) {
    throw ApiError.badRequest(`Failed to upload file to storage: ${storageError.message}`);
  }

  const userClient = createUserClient(accessToken);
  const evidencePayload = {
    incident_id: incidentId,
    user_id: profileId,
    tipo_evidencia: inferredType,
    titulo: payload.titulo ?? null,
    descripcion: payload.descripcion ?? null,
    storage_path: storagePath,
    original_filename: file.originalname,
    mime_type: file.mimetype,
    size_bytes: file.size,
    sha256_hash: calculateSha256(file.buffer),
    taken_at: payload.taken_at ?? null,
    is_private:
      payload.is_private === null || payload.is_private === undefined ? true : payload.is_private
  };

  const { data, error } = await userClient
    .from('evidences')
    .insert(evidencePayload)
    .select('*')
    .single();

  if (error) {
    await supabaseAdmin.storage.from(EVIDENCE_BUCKET).remove([storagePath]);
    throw ApiError.badRequest(error.message);
  }

  return data;
};

const updateEvidenceIncident = async ({ accessToken, profileId, evidenceId, incidentId }) => {
  const currentEvidence = await getEvidenceRecordByIdOrThrow({ accessToken, profileId, evidenceId });

  await ensureOwnedIncidentIfProvided({ accessToken, profileId, incidentId });

  const userClient = createUserClient(accessToken);
  const { data, error } = await userClient
    .from('evidences')
    .update({
      incident_id: incidentId ?? null,
      updated_at: new Date().toISOString()
    })
    .eq('id', evidenceId)
    .eq('user_id', profileId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw ApiError.badRequest(error.message);
  }

  if (!data) {
    throw ApiError.notFound('Evidence not found');
  }

  return {
    evidence: data,
    previousIncidentId: currentEvidence.incident_id ?? null
  };
};

const listIncidentEvidences = async ({ accessToken, profileId, incidentId }) => {
  await incidentsService.getIncidentByIdOrThrow({ accessToken, profileId, incidentId });

  const userClient = createUserClient(accessToken);
  const { data, error } = await userClient
    .from('evidences')
    .select('*')
    .eq('incident_id', incidentId)
    .eq('user_id', profileId)
    .order('created_at', { ascending: false });

  if (error) {
    throw ApiError.internal('Failed to fetch evidences', error.message);
  }

  return data;
};

const listEvidences = async ({ accessToken, profileId }) => {
  const userClient = createUserClient(accessToken);
  const { data, error } = await userClient
    .from('evidences')
    .select('*')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false });

  if (error) {
    throw ApiError.internal('Failed to fetch evidences', error.message);
  }

  return data;
};

const deleteEvidence = async ({ accessToken, profileId, evidenceId }) => {
  const evidence = await getEvidenceRecordByIdOrThrow({ accessToken, profileId, evidenceId });
  const userClient = createUserClient(accessToken);

  const { data, error } = await userClient
    .from('evidences')
    .delete()
    .eq('id', evidenceId)
    .eq('user_id', profileId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw ApiError.badRequest(error.message);
  }

  if (!data) {
    throw ApiError.notFound('Evidence not found');
  }

  const { error: storageError } = await supabaseAdmin.storage
    .from(EVIDENCE_BUCKET)
    .remove([evidence.storage_path]);

  if (storageError) {
    console.error('Failed to delete evidence file from storage:', storageError.message);
  }

  return data;
};

module.exports = {
  getEvidenceByIdOrThrow,
  createEvidence,
  updateEvidenceIncident,
  listEvidences,
  listIncidentEvidences,
  deleteEvidence
};
