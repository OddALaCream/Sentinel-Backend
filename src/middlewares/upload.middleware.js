const multer = require('multer');

const ApiError = require('../utils/apiError');

const maxEvidenceSizeMb = Number.parseInt(process.env.MAX_EVIDENCE_SIZE_MB, 10) || 20;

const allowedExactMimeTypes = new Set([
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/rtf',
  'application/vnd.oasis.opendocument.text'
]);

const isAllowedMimeType = (mimeType) => {
  if (!mimeType) {
    return false;
  }

  return (
    mimeType.startsWith('audio/') ||
    mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    allowedExactMimeTypes.has(mimeType)
  );
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxEvidenceSizeMb * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!isAllowedMimeType(file.mimetype)) {
      return cb(
        new ApiError(
          400,
          'Tipo de archivo no permitido. Usa audio, imagen, video, PDF o documentos compatibles'
        )
      );
    }

    return cb(null, true);
  }
});

const uploadEvidence = upload.single('file');

module.exports = {
  uploadEvidence,
  isAllowedMimeType,
  maxEvidenceSizeMb
};
