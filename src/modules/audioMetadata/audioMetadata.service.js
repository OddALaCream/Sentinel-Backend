const { createUserClient } = require('../../config/supabaseClient');
const ApiError = require('../../utils/apiError');
const evidencesService = require('../evidences/evidences.service');

const ensureAudioEvidence = async ({ accessToken, profileId, evidenceId }) => {
  const evidence = await evidencesService.getEvidenceByIdOrThrow({
    accessToken,
    profileId,
    evidenceId
  });

  if (evidence.tipo_evidencia !== 'audio') {
    throw ApiError.badRequest('Audio metadata can only be attached to evidence of type "audio"');
  }

  return evidence;
};

const createAudioMetadata = async ({ accessToken, profileId, evidenceId, payload }) => {
  await ensureAudioEvidence({ accessToken, profileId, evidenceId });

  const userClient = createUserClient(accessToken);
  const { data, error } = await userClient
    .from('audio_metadata')
    .insert({
      evidence_id: evidenceId,
      duration_seconds: payload.duration_seconds ?? null,
      transcript: payload.transcript ?? null,
      language: payload.language ?? null
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw ApiError.conflict('Audio metadata already exists for this evidence');
    }

    throw ApiError.badRequest(error.message);
  }

  return data;
};

const getAudioMetadata = async ({ accessToken, profileId, evidenceId }) => {
  await ensureAudioEvidence({ accessToken, profileId, evidenceId });

  const userClient = createUserClient(accessToken);
  const { data, error } = await userClient
    .from('audio_metadata')
    .select('*')
    .eq('evidence_id', evidenceId)
    .maybeSingle();

  if (error) {
    throw ApiError.internal('Failed to fetch audio metadata', error.message);
  }

  if (!data) {
    throw ApiError.notFound('Audio metadata not found');
  }

  return data;
};

const updateAudioMetadata = async ({ accessToken, profileId, evidenceId, payload }) => {
  await ensureAudioEvidence({ accessToken, profileId, evidenceId });

  const userClient = createUserClient(accessToken);
  const updates = {};

  ['duration_seconds', 'transcript', 'language'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      updates[field] = payload[field];
    }
  });

  const { data, error } = await userClient
    .from('audio_metadata')
    .update(updates)
    .eq('evidence_id', evidenceId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw ApiError.badRequest(error.message);
  }

  if (!data) {
    throw ApiError.notFound('Audio metadata not found');
  }

  return data;
};

module.exports = {
  createAudioMetadata,
  getAudioMetadata,
  updateAudioMetadata
};
