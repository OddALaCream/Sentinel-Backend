const { z } = require('zod');

const ApiError = require('./apiError');

const ALLOWED_EVIDENCE_TYPES = ['audio', 'imagen', 'video', 'documento', 'texto'];
const ALLOWED_RISK_LEVELS = ['bajo', 'medio', 'alto', 'critico'];
const ALLOWED_INCIDENT_STATUSES = ['borrador', 'registrado', 'revisado', 'archivado'];

const normalizeOptionalString = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const stripUndefinedFields = (data) =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));

const requiredString = (label, max) =>
  z
    .string({
      required_error: `${label} es obligatorio`,
      invalid_type_error: `${label} debe ser una cadena de texto`
    })
    .trim()
    .min(1, `${label} es obligatorio`)
    .max(max, `${label} no puede superar ${max} caracteres`);

const optionalString = (label, max) =>
  z.preprocess(
    normalizeOptionalString,
    z
      .string({
        invalid_type_error: `${label} debe ser una cadena de texto`
      })
      .max(max, `${label} no puede superar ${max} caracteres`)
      .optional()
  );

const nullableTrimmedString = (maxLength) =>
  z.preprocess(
    (value) => {
      if (value === null) {
        return null;
      }
      return normalizeOptionalString(value) ?? null;
    },
    z.string().trim().max(maxLength).nullable().optional()
  );

const optionalBoolean = (label = 'valor') =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') {
        return true;
      }

      if (value.toLowerCase() === 'false') {
        return false;
      }
    }

    return value;
  }, z.boolean({ invalid_type_error: `${label} debe ser verdadero o falso` }).optional());

const optionalInteger = (labelOrOptions = 'valor', minValue = 0) => {
  const config =
    typeof labelOrOptions === 'object'
      ? {
          label: 'valor',
          min: labelOrOptions.min ?? Number.MIN_SAFE_INTEGER,
          max: labelOrOptions.max ?? Number.MAX_SAFE_INTEGER
        }
      : {
          label: labelOrOptions,
          min: minValue,
          max: Number.MAX_SAFE_INTEGER
        };

  return z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value === 'string') {
      return Number.parseInt(value, 10);
    }

    return value;
  }, z.number({ invalid_type_error: `${config.label} debe ser un numero` }).int(`${config.label} debe ser un entero`).min(config.min, `${config.label} debe ser mayor o igual a ${config.min}`).max(config.max, `${config.label} debe ser menor o igual a ${config.max}`).optional());
};

const optionalDateString = (label) =>
  z.preprocess(
    normalizeOptionalString,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} debe tener formato YYYY-MM-DD`)
      .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), {
        message: `${label} debe ser una fecha valida`
      })
      .optional()
  );

const nullableDateString = (label = 'fecha') =>
  z.preprocess(
    (value) => {
      const normalizedValue = normalizeOptionalString(value);
      return normalizedValue === undefined ? undefined : normalizedValue;
    },
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} debe tener formato YYYY-MM-DD`)
      .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), {
        message: `${label} debe ser una fecha valida`
      })
      .nullable()
      .optional()
  );

const optionalDateTimeString = (label) =>
  z.preprocess(
    normalizeOptionalString,
    z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: `${label} debe ser una fecha valida en formato ISO 8601`
      })
      .optional()
  );

const nullableDateTimeString = (label = 'fecha') =>
  z.preprocess(
    (value) => {
      const normalizedValue = normalizeOptionalString(value);
      return normalizedValue === undefined ? undefined : normalizedValue;
    },
    z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: `${label} debe ser una fecha valida en formato ISO 8601`
      })
      .nullable()
      .optional()
  );

const optionalEmail = (label) =>
  z.preprocess(
    normalizeOptionalString,
    z
      .string()
      .email(`${label} debe tener un formato valido`)
      .max(255, `${label} no puede superar 255 caracteres`)
      .optional()
  );

const validate = (schema, property = 'body') => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync(req[property]);
    req[property] =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? stripUndefinedFields(parsed)
        : parsed;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(
        new ApiError(400, 'Error de validacion', {
          errors: error.issues.map((issue) => ({
            field: issue.path.join('.') || property,
            message: issue.message
          }))
        })
      );
    }

    return next(error);
  }
};

const validateRequest = validate;

const registerSchema = z.object({
  email: z
    .string({
      required_error: 'email es obligatorio',
      invalid_type_error: 'email debe ser una cadena de texto'
    })
    .trim()
    .email('email debe tener un formato valido')
    .max(255, 'email no puede superar 255 caracteres'),
  password: z
    .string({
      required_error: 'password es obligatorio',
      invalid_type_error: 'password debe ser una cadena de texto'
    })
    .min(8, 'password debe tener al menos 8 caracteres')
    .max(72, 'password no puede superar 72 caracteres')
});

const loginSchema = registerSchema;

const profileCreateSchema = z.object({
  nombre: requiredString('nombre', 100),
  apellido_p: requiredString('apellido_p', 100),
  apellido_m: optionalString('apellido_m', 100),
  fecha_nacimiento: optionalDateString('fecha_nacimiento'),
  telefono: optionalString('telefono', 30),
  email: optionalEmail('email'),
  direccion_opcional: optionalString('direccion_opcional', 2000)
});

const profileUpdateSchema = z
  .object({
    nombre: optionalString('nombre', 100),
    apellido_p: optionalString('apellido_p', 100),
    apellido_m: optionalString('apellido_m', 100),
    fecha_nacimiento: optionalDateString('fecha_nacimiento'),
    telefono: optionalString('telefono', 30),
    email: optionalEmail('email'),
    direccion_opcional: optionalString('direccion_opcional', 2000)
  })
  .transform(stripUndefinedFields)
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar'
  });

const emergencyContactCreateSchema = z.object({
  nombre_completo: requiredString('nombre_completo', 150),
  parentesco: optionalString('parentesco', 80),
  telefono: requiredString('telefono', 30),
  telefono_alternativo: optionalString('telefono_alternativo', 30),
  prioridad: optionalInteger('prioridad', 1),
  puede_recibir_alertas: optionalBoolean('puede_recibir_alertas')
});

const emergencyContactUpdateSchema = z
  .object({
    nombre_completo: optionalString('nombre_completo', 150),
    parentesco: optionalString('parentesco', 80),
    telefono: optionalString('telefono', 30),
    telefono_alternativo: optionalString('telefono_alternativo', 30),
    prioridad: optionalInteger('prioridad', 1),
    puede_recibir_alertas: optionalBoolean('puede_recibir_alertas')
  })
  .transform(stripUndefinedFields)
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar'
  });

const incidentCreateSchema = z.object({
  titulo: requiredString('titulo', 150),
  descripcion: optionalString('descripcion', 5000),
  tipo_incidente: requiredString('tipo_incidente', 50),
  fecha_incidente: optionalDateTimeString('fecha_incidente'),
  lugar: optionalString('lugar', 2000),
  nivel_riesgo: z.preprocess(
    normalizeOptionalString,
    z.enum(ALLOWED_RISK_LEVELS, {
      errorMap: () => ({
        message: `nivel_riesgo debe ser uno de: ${ALLOWED_RISK_LEVELS.join(', ')}`
      })
    }).optional()
  ),
  estado: z.preprocess(
    normalizeOptionalString,
    z.enum(ALLOWED_INCIDENT_STATUSES, {
      errorMap: () => ({
        message: `estado debe ser uno de: ${ALLOWED_INCIDENT_STATUSES.join(', ')}`
      })
    }).optional()
  )
});

const incidentUpdateSchema = z
  .object({
    titulo: optionalString('titulo', 150),
    descripcion: optionalString('descripcion', 5000),
    tipo_incidente: optionalString('tipo_incidente', 50),
    fecha_incidente: optionalDateTimeString('fecha_incidente'),
    lugar: optionalString('lugar', 2000),
    nivel_riesgo: z.preprocess(
      normalizeOptionalString,
      z.enum(ALLOWED_RISK_LEVELS, {
        errorMap: () => ({
          message: `nivel_riesgo debe ser uno de: ${ALLOWED_RISK_LEVELS.join(', ')}`
        })
      }).optional()
    ),
    estado: z.preprocess(
      normalizeOptionalString,
      z.enum(ALLOWED_INCIDENT_STATUSES, {
        errorMap: () => ({
          message: `estado debe ser uno de: ${ALLOWED_INCIDENT_STATUSES.join(', ')}`
        })
      }).optional()
    )
  })
  .transform(stripUndefinedFields)
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar'
  });

const evidenceCreateSchema = z.object({
  tipo_evidencia: z.enum(ALLOWED_EVIDENCE_TYPES, {
    errorMap: () => ({
      message: `tipo_evidencia debe ser uno de: ${ALLOWED_EVIDENCE_TYPES.join(', ')}`
    })
  }),
  titulo: optionalString('titulo', 150),
  descripcion: optionalString('descripcion', 5000),
  taken_at: optionalDateTimeString('taken_at'),
  is_private: optionalBoolean('is_private')
});

const audioMetadataCreateSchema = z.object({
  duration_seconds: optionalInteger('duration_seconds', 0),
  transcript: optionalString('transcript', 20000),
  language: optionalString('language', 20)
});

const audioMetadataUpdateSchema = z
  .object({
    duration_seconds: optionalInteger('duration_seconds', 0),
    transcript: optionalString('transcript', 20000),
    language: optionalString('language', 20)
  })
  .transform(stripUndefinedFields)
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar'
  });

const incidentContactLinkSchema = z.object({
  rol: optionalString('rol', 50)
});

const uuidField = (label) => z.string().uuid(`${label} debe ser un UUID valido`);

const idParamSchema = z.object({
  id: uuidField('id')
});

const incidentIdParamSchema = z.object({
  incidentId: uuidField('incidentId')
});

const evidenceIdParamSchema = z.object({
  evidenceId: uuidField('evidenceId')
});

const contactIdParamSchema = z.object({
  contactId: uuidField('contactId')
});

const incidentContactParamsSchema = z.object({
  incidentId: uuidField('incidentId'),
  contactId: uuidField('contactId')
});

module.exports = {
  z,
  validate,
  validateRequest,
  nullableTrimmedString,
  nullableDateString,
  nullableDateTimeString,
  optionalBoolean,
  optionalInteger,
  EVIDENCE_TYPES: ALLOWED_EVIDENCE_TYPES,
  INCIDENT_RISK_LEVELS: ALLOWED_RISK_LEVELS,
  INCIDENT_STATUSES: ALLOWED_INCIDENT_STATUSES,
  ALLOWED_EVIDENCE_TYPES,
  ALLOWED_RISK_LEVELS,
  ALLOWED_INCIDENT_STATUSES,
  schemas: {
    auth: {
      register: registerSchema,
      login: loginSchema
    },
    profiles: {
      create: profileCreateSchema,
      update: profileUpdateSchema
    },
    emergencyContacts: {
      create: emergencyContactCreateSchema,
      update: emergencyContactUpdateSchema
    },
    incidents: {
      create: incidentCreateSchema,
      update: incidentUpdateSchema,
      linkContact: incidentContactLinkSchema
    },
    evidences: {
      create: evidenceCreateSchema
    },
    audioMetadata: {
      create: audioMetadataCreateSchema,
      update: audioMetadataUpdateSchema
    },
    params: {
      id: idParamSchema,
      incidentId: incidentIdParamSchema,
      evidenceId: evidenceIdParamSchema,
      contactId: contactIdParamSchema,
      incidentContact: incidentContactParamsSchema
    }
  }
};
