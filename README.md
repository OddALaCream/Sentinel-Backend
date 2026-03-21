# Sentinel Backend

Backend REST en Node.js + Express + Supabase para registrar perfiles, incidentes, evidencias, metadatos de audio y contactos de emergencia.

## Stack

- Node.js
- Express
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- dotenv
- multer
- zod

## Requisitos

- Node.js 18 o superior
- Un proyecto de Supabase con las tablas ya creadas
- RLS configurado en Supabase
- Bucket privado `evidences`

## Variables de entorno

Crea un archivo `.env` usando `.env.example`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3000
MAX_EVIDENCE_SIZE_MB=20
NODE_ENV=production
```

## Instalacion y arranque

```bash
npm install
npm run dev
```

Servidor por defecto:

```text
http://144.22.43.169:3000
```

## Docker para produccion

1. Crea tu archivo de entorno:

```bash
cp .env.example .env
```

En PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Completa las variables reales de Supabase en `.env`.

3. Construye la imagen:

```bash
docker build -t sentinel-backend:latest .
```

4. Ejecuta el contenedor:

```bash
docker run -d \
  --name sentinel-backend \
  --env-file .env \
  -p 3000:3000 \
  --restart unless-stopped \
  sentinel-backend:latest
```

5. O levanta el servicio con Compose:

```bash
docker compose up -d --build
```

Notas:

- La imagen usa `NODE_ENV=production`.
- No se copian secretos ni `node_modules` locales al contexto de build.
- El contenedor expone `3000` internamente y define `HEALTHCHECK` sobre `GET /health`.
- Este servicio no incluye base de datos propia porque depende de Supabase externo.
- En VPS con Nginx, el `docker-compose.yml` publica el contenedor en `127.0.0.1:3000` por defecto para que no quede expuesto a internet.
- Hay una guia lista para VPS en `deploy/DEPLOY_VPS.md`.

Health check:

```http
GET /health
```

## Exponer RAG_HACKATON_SENTINEL como endpoint GET

El modulo `RAG_HACKATON_SENTINEL` ahora puede correr como servicio HTTP con FastAPI.

1. Instalar dependencias del RAG:

```bash
cd RAG_HACKATON_SENTINEL
pip install -r requirements.txt
```

2. Levantar el servicio:

```bash
uvicorn api:app --host 0.0.0.0 --port 8000
```

3. Consumir endpoints del RAG:

```http
GET /rag/query?question=Que%20debo%20hacer%20si%20sufro%20violencia&conversation_id=chat_principal
```

```http
POST /rag/evidence/laws
Content-Type: application/json

{
  "evidencia": "Mi ex pareja me obligo a tener relaciones sin consentimiento y me amenazo para no denunciar.",
  "max_leyes": 3
}
```

Ejemplo completo local:

```text
http://144.22.43.169:8000/rag/query?question=Que%20debo%20hacer%20si%20sufro%20violencia&conversation_id=chat_principal
```

Ejemplo de invocacion del endpoint legal (PowerShell):

```powershell
Invoke-RestMethod -Method POST "http://144.22.43.169:8000/rag/evidence/laws" `
  -ContentType "application/json" `
  -Body '{"evidencia":"Mi ex pareja me obligo a tener relaciones sin consentimiento y me amenazo para no denunciar.","max_leyes":3}'
```

Health del servicio RAG:

```text
http://144.22.43.169:8000/health
```

## Estructura

```text
src/
  app.js
  server.js
  config/
    supabaseClient.js
  middlewares/
    auth.middleware.js
    error.middleware.js
    upload.middleware.js
  modules/
    auth/
    profiles/
    emergencyContacts/
    incidents/
    evidences/
    audioMetadata/
    auditLogs/
  utils/
    apiError.js
    asyncHandler.js
    supabase.js
    validators.js
```

## Autenticacion en Postman

1. Registra o autentica un usuario con `/auth/register` o `/auth/login`.
2. Copia el `access_token`.
3. En rutas protegidas usa:

```http
Authorization: Bearer <access_token>
```

## Flujo recomendado de prueba

1. Registrar usuario
2. Login
3. Crear perfil
4. Crear contacto de emergencia
5. Subir evidencia sin incidente o crear incidente primero
6. Asociar o reasignar la evidencia al incidente cuando corresponda
7. Crear audio metadata si la evidencia es de tipo `audio`

## Payloads de ejemplo

### 1. Registro

```http
POST /auth/register
Content-Type: application/json
```

```json
{
  "email": "ana@example.com",
  "password": "ClaveSegura123"
}
```

### 2. Login

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "ana@example.com",
  "password": "ClaveSegura123"
}
```

### 3. Crear perfil

```http
POST /profiles
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "nombre": "Ana",
  "apellido_p": "Lopez",
  "apellido_m": "Soto",
  "fecha_nacimiento": "1998-05-14",
  "telefono": "76543210",
  "email": "ana@example.com",
  "direccion_opcional": "Zona Sur, referencia cercana a la plaza"
}
```

### 4. Actualizar perfil

```http
PUT /profiles/me
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "telefono": "77777777",
  "direccion_opcional": "Nueva direccion de referencia"
}
```

### 5. Crear contacto de emergencia

```http
POST /contacts
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "nombre_completo": "Maria Perez",
  "parentesco": "Hermana",
  "telefono": "70111222",
  "telefono_alternativo": "70111333",
  "prioridad": 1,
  "puede_recibir_alertas": true
}
```

### 6. Crear incidente

```http
POST /incidents
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "titulo": "Amenazas reiteradas",
  "descripcion": "Se registraron llamadas y mensajes intimidatorios.",
  "tipo_incidente": "amenaza",
  "fecha_incidente": "2026-03-18T18:30:00Z",
  "lugar": "Domicilio particular",
  "nivel_riesgo": "alto",
  "estado": "registrado"
}
```

### 7. Asociar contacto a incidente

```http
POST /incidents/:incidentId/contacts/:contactId
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "rol": "Contacto principal"
}
```

### 8. Subir evidencia sin incidente

```http
POST /evidences
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Campos de formulario:

- `file`: archivo
- `tipo_evidencia`: `audio` | `imagen` | `video` | `documento` | `texto`
- `titulo`: opcional
- `descripcion`: opcional
- `taken_at`: opcional, ISO 8601
- `is_private`: opcional, `true` o `false`

Ejemplo:

```text
file = audio-prueba.m4a
tipo_evidencia = audio
titulo = Audio pendiente de asociacion
descripcion = Grabacion realizada desde el telefono
taken_at = 2026-03-18T18:32:00Z
is_private = true
```

### 9. Subir evidencia directo a un incidente

```http
POST /incidents/:incidentId/evidences
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Campos de formulario:

- `file`: archivo
- `tipo_evidencia`: `audio` | `imagen` | `video` | `documento` | `texto`
- `titulo`: opcional
- `descripcion`: opcional
- `taken_at`: opcional, ISO 8601
- `is_private`: opcional, `true` o `false`

Ejemplo:

```text
file = audio-prueba.m4a
tipo_evidencia = audio
titulo = Audio de amenaza
descripcion = Grabacion realizada desde el telefono
taken_at = 2026-03-18T18:32:00Z
is_private = true
```

Las nuevas evidencias se almacenan en Storage desacopladas del incidente, con un formato:

```text
<auth_user_id>/evidences/<filename>
```

### 10. Asociar, cambiar o quitar el incidente de una evidencia

```http
PUT /evidences/:evidenceId/incident
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "incident_id": "uuid-del-incidente"
}
```

Para quitar la asociacion actual:

```json
{
  "incident_id": null
}
```

### 11. Crear audio metadata

```http
POST /evidences/:evidenceId/audio-metadata
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "duration_seconds": 42,
  "transcript": "No vuelvas a denunciar o te va a ir peor.",
  "language": "es"
}
```

## Endpoints disponibles (Backend y RAG)

### Backend REST (Node.js + Express)

Publicos:

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`

Protegidos (requieren `Authorization: Bearer <access_token>`):

- `POST /profiles`
- `GET /profiles/me`
- `PUT /profiles/me`
- `POST /contacts`
- `GET /contacts`
- `GET /contacts/:id`
- `PUT /contacts/:id`
- `DELETE /contacts/:id`
- `POST /incidents`
- `GET /incidents`
- `GET /incidents/:id`
- `PUT /incidents/:id`
- `DELETE /incidents/:id`
- `POST /incidents/:incidentId/contacts/:contactId`
- `GET /incidents/:incidentId/contacts`
- `DELETE /incidents/:incidentId/contacts/:contactId`
- `POST /evidences`
- `GET /evidences`
- `POST /incidents/:incidentId/evidences`
- `GET /incidents/:incidentId/evidences`
- `GET /evidences/:id`
- `PUT /evidences/:id/incident`
- `DELETE /evidences/:id`
- `POST /evidences/:evidenceId/audio-metadata`
- `GET /evidences/:evidenceId/audio-metadata`
- `PUT /evidences/:evidenceId/audio-metadata`

### RAG API (FastAPI)

Publicos:

- `GET /health`
- `GET /rag/query?question=<texto>&conversation_id=<id_opcional>`
- `POST /rag/evidence/laws`

Payload de `POST /rag/evidence/laws`:

```json
{
  "evidencia": "Texto del caso para analizar",
  "max_leyes": 3
}
```

Respuesta esperada (resumen):

```json
{
  "success": true,
  "data": {
    "evidencia": "Texto del caso para analizar",
    "best_score": 0.82,
    "used_rag_context": true,
    "leyes": [
      {
        "ley": "Sentencia Constitucional Plurinacional 0206/2014",
        "articulos": ["Art. 203", "Art. 179 bis"],
        "descripcion_breve": "...",
        "por_que_aplica": "..."
      }
    ]
  }
}
```

## Notas de implementacion

- El backend valida JWT por `Authorization: Bearer <token>`.
- El acceso a datos usa Supabase con RLS y ademas validacion de ownership en backend.
- El cliente admin solo se usa para Storage y auditoria.
- Al eliminar una evidencia se intenta eliminar tambien su archivo de Storage.
- Al consultar `GET /evidences/:id` se devuelve una `signed_url` temporal para acceder al archivo privado.
- `PUT /evidences/:id/incident` permite asociar, reasignar o quitar la relacion con un incidente enviando `incident_id` o `null`.
- Al eliminar un incidente se limpian tambien sus archivos asociados en Storage antes de borrar el registro.

## Respuesta JSON

Exito:

```json
{
  "success": true,
  "message": "Operacion exitosa",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Descripcion del error",
  "details": {
    "errors": [
      {
        "field": "email",
        "message": "email debe tener un formato valido"
      }
    ]
  }
}
```
