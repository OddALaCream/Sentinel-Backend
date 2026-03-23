# 🚀 Guía de Diagnóstico en Producción (Docker)

## 1. Ver Logs del Contenedor

### Opción A: Últimos 100 logs
```bash
# SSH al servidor
ssh user@your-production-server

# Ver logs del contenedor
docker logs --tail 100 <container_name>
```

### Opción B: Logs en tiempo real
```bash
docker logs -f <container_name>
```

### Opción C: Filtrar solo errores
```bash
docker logs <container_name> 2>&1 | grep -E "(error|Error|ERROR|❌|🔴|pgrst)"
```

---

## 2. Usar Endpoint de Diagnóstico

### Desde producción (sin SSH)
```bash
curl https://tu-produccion.com/diagnose
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "All systems operational",
  "diagnostics": {
    "server": {
      "uptime": 12345.67,
      "environment": "production",
      "nodeVersion": "v22.20.0"
    },
    "supabase": {
      "url": "✅ Configured",
      "anonKey": "✅ Configured",
      "serviceRoleKey": "✅ Configured"
    },
    "connectivity": {
      "supabase": "✅ Connected"
    },
    "errors": []
  }
}
```

### Respuesta con errores:
```json
{
  "success": false,
  "message": "Issues detected",
  "diagnostics": {
    "errors": [
      {
        "type": "Supabase Connection",
        "message": "FATAL: role postgres does not exist"
      }
    ]
  }
}
```

---

## 3. Errores Comunes en Producción

### ❌ Error: "role postgres does not exist"
**Causa**: Variables de entorno mal configuradas
**Solución**:
```bash
# Verificar env en el contenedor
docker exec <container_name> env | grep SUPABASE

# Debe mostrar:
# SUPABASE_URL=https://xxx.supabase.co
# SUPABASE_ANON_KEY=eyJxx...
# SUPABASE_SERVICE_ROLE_KEY=eyJxx...
```

### ❌ Error: "connect ECONNREFUSED 127.0.0.1:5432"
**Causa**: BD no disponible o credenciales incorrectas
**Solución**:
1. Verifica que Supabase esté operativo en su panel
2. Verifica que las URLs sean correctas (no localhost, usar URL completa de Supabase)
3. Reinicia el contenedor:
```bash
docker restart <container_name>
```

### ⚠️ Error: "pgrst204" o "pgrst205"
**Causa**: Schema cache de PostgREST desactualizado (TEMPORAL)
**Respuesta**: El retry handler reintentará automáticamente
**Logs esperados**:
```
⚠️ [UPDATE Incident] PostgREST cache/transient error (attempt 1/3)
⏳ Retrying in 1000ms... (2 retries left)
✅ [UPDATE Incident] SUCCESS on retry 1/2
```

---

## 4. Logs Importantes que Debes Ver

### ✅ Logs Normales (OK)
```
Server listening on port 3000
POST /auth/login [200] 150ms
GET /incidents [200] 85ms
PUT /incidents/:id [200] 320ms
```

### ⚠️ Logs de Reintentos (También OK - se resuelven)
```
⚠️ [UPDATE Incident] PostgREST cache/transient error (attempt 1/3): could not find column
⏳ Retrying in 1000ms...
✅ [UPDATE Incident] SUCCESS on retry 1/2
```

### 🔴 Logs de Problemas Reales (REQUIEREN ACCIÓN)
```
❌ [UPDATE Incident] Failed after 3 attempts. Last error: FATAL: role postgres does not exist
Error de validacion: "email debe tener un formato valido"
connection ECONNREFUSED - Cannot connect to Supabase
```

---

## 5. Verificación Rápida

Después de deployar, ejecuta:

```bash
# Test 1: Health check
curl https://tu-produccion.com/health
# Debe retornar: {"success": true, "message": "Servidor operativo"}

# Test 2: Diagnóstico
curl https://tu-produccion.com/diagnose
# Debe retornar: {"success": true} sin errores

# Test 3: Login (si es posible)
curl -X POST https://tu-produccion.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# Debe retornar token o error de credenciales (200 o 400)
```

---

## 6. Debug en Profundidad

### Ver todas las variables de entorno
```bash
docker exec <container_name> env | grep -i supabase
```

### Ver si el proceso está corriendo
```bash
docker exec <container_name> ps aux | grep node
```

### Ejecutar comando dentro del contenedor
```bash
docker exec <container_name> curl http://localhost:3000/health
```

### Ver logs de los últimos 5 minutos
```bash
docker logs --since 5m <container_name>
```

---

## 7. Pasos de Troubleshooting

### Si nada funciona:

1. **Verificar variables de entorno**
   ```bash
   docker exec <container_name> env | grep SUPABASE
   ```

2. **Ver logs completos**
   ```bash
   docker logs <container_name> | tail -50
   ```

3. **Probar endpoint de diagnóstico**
   ```bash
   curl https://tu-produccion.com/diagnose -v
   ```

4. **Verificar conectividad a Supabase**
   ```bash
   # Desde el contenedor
   docker exec <container_name> curl https://tgkwvmurozbiisrjamdx.supabase.co/rest/v1
   ```

5. **Reiniciar contenedor**
   ```bash
   docker restart <container_name>
   ```

6. **Reconstruir imagen (si hay cambios de código)**
   ```bash
   docker build -t tu-imagen .
   docker run -d --env-file .env -p 3000:3000 tu-imagen
   ```

---

## 8. Variables de Entorno Requeridas

Asegúrate de que en tu `.env` en producción estén:

```
SUPABASE_URL=https://tgkwvmurozbiisrjamdx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
```

**DON'T USE LOCALHOST** - Usa siempre las URLs completas de Supabase

---

## 9. Monitoreo Continuo

Crea este script en tu servidor:

```bash
#!/bin/bash
# monitor-prod.sh

while true; do
  echo "=== Health Check ==="
  curl -s https://tu-produccion.com/health | jq .

  echo -e "\n=== Diagnostics ==="
  curl -s https://tu-produccion.com/diagnose | jq .

  echo -e "\n=== Recent Errors ==="
  docker logs --tail 20 <container_name> 2>&1 | grep -E "(error|Error|❌)" || echo "No recent errors"

  echo -e "\n=== Waiting 60 seconds ===\n"
  sleep 60
done
```

Ejecutar:
```bash
bash monitor-prod.sh
```

---

## ✅ Checklist de Deployment

- [ ] Variables de entorno configuradas correctamente
- [ ] `/health` endpoint retorna 200
- [ ] `/diagnose` endpoint retorna `"success": true`
- [ ] Login funciona
- [ ] Crear incidente funciona
- [ ] Subir evidencia funciona
- [ ] Ver logs sin errores críticos
- [ ] Retry handler está activo (si hay errores transitorios)

Si todo pasa el checklist, **la aplicación está lista** ✅
