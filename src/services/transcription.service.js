const OPENAI_TRANSCRIPTIONS_URL = 'https://api.openai.com/v1/audio/transcriptions';

const getOpenAiApiKey = () => process.env.OPENAI_API_KEY?.trim() || null;

const isTranscriptionEnabled = () => Boolean(getOpenAiApiKey());

const getTranscriptionConfig = () => ({
  model: process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || 'gpt-4o-mini-transcribe',
  language: process.env.OPENAI_TRANSCRIPTION_LANGUAGE?.trim() || null,
  prompt: process.env.OPENAI_TRANSCRIPTION_PROMPT?.trim() || null
});

const transcribeAudio = async ({ buffer, filename, mimeType }) => {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    return null;
  }

  const formData = new FormData();
  const config = getTranscriptionConfig();

  formData.append('file', new Blob([buffer], { type: mimeType }), filename);
  formData.append('model', config.model);

  if (config.language) {
    formData.append('language', config.language);
  }

  if (config.prompt) {
    formData.append('prompt', config.prompt);
  }

  const response = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const details = payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(`OpenAI transcription failed: ${details}`);
  }

  return {
    transcript: payload?.text?.trim() || null,
    language: payload?.language || config.language
  };
};

module.exports = {
  isTranscriptionEnabled,
  transcribeAudio
};
