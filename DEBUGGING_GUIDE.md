# 📋 Guía Completa: Dónde Ver Errores de Base de Datos

## 🔍 Cómo Diagnosticar Problemas

### 1. **Logs del Servidor (Primera Línea de Defensa)**

#### Opción A: Ver logs en tiempo real
```bash
# En la carpeta del proyecto
tail -f /tmp/server_retry.log
```

#### Opción B: Ver últimos errores
```bash
tail -100 /tmp/server_retry.log | grep -E "(error|Error|ERROR|pgrst|⚠️|❌|🔴)"
```

#### Opción C: En Windows (PowerShell)
```powershell
Get-Content /tmp/server_retry.log -Tail 100
```

---

## 📝 Qué Mensaje de Error Significa Qué

### Si ves estos mensajes = BD funcionando correctamente ✅
```
POST /incidents 201
GET /evidences 200
PUT /incidents/:id 200
```

### Si ves estos mensajes = Problema de ESQUEMA (ahora solucionado) ⚠️
```
❌ [UPDATE Incident] PostgREST cache/transient error (attempt 1/3): could not find column
⏳ Retrying in 1000ms... (2 retries left)

✅ [UPDATE Incident] SUCCESS on retry 1/2
```

**Significa**: El retry handler detectó un error de cache y lo reintentó automáticamente ✅

### Si ves estos mensajes = Problema REAL en BD 🔴
```
🔴 PostgREST Cache Error Detected: could not find table "evidences"
❌ [UPDATE Incident] Failed after 3 attempts. Last error: ...
```

**Significa**: Problema real, no solo transiente. Revisa permisos de BD.

---

## 🔧 Errores Específicos de Supabase

| Error | Causa Probable | Solución |
|-------|----------------|----------|
| `pgrst204` | Schema cache desactualizado | ✅ Ya manejado (reintentos automáticos) |
| `pgrst205` | Schema cache desactualizado | ✅ Ya manejado (reintentos automáticos) |
| `could not find column` | Esquema actualizado | ✅ Ya manejado (reintentos automáticos) |
| `could not find table` | Tabla no existe | ❌ Problema real - revisar DB |
| `permission denied` | Permisos insuficientes | ❌ Problema real - revisar RLS |
| `connection refused` | BD desconectada | ❌ Problema real - revisar servidor |

---

## 📊 Cómo Leer Los Logs Detallados

### Ejemplo 1: Operación Exitosa (NORMAL)
```
POST /incidents/fb84d248.../update [200] 851ms - 517 bytes
```
✅ Esperado - La operación funcionó

---

### Ejemplo 2: Retry por Error de Cache (ESPERADO DURANTE MIGRACIONES)
```
⚠️  [UPDATE Incident] PostgREST cache/transient error (attempt 1/3): could not find column "nivel_riesgo"
⏳ Retrying in 1000ms... (2 retries left)
⚠️  [UPDATE Incident] PostgREST cache/transient error (attempt 2/3): could not find column "nivel_riesgo"
⏳ Retrying in 2000ms... (1 retries left)
✅ [UPDATE Incident] SUCCESS on retry 2/2
PUT /incidents/fb84d248.../update [200] 3650ms - 517 bytes
```

**Análisis**:
- ⚠️ Primera llamada: Error de cache (normal durante migraciones)
- ⏳ Espera 1 segundo
- ⚠️ Segunda llamada: Aún hay error
- ⏳ Espera 2 segundos
- ✅ Tercera llamada: Funciona (BD se actualizó)
- Total: Tardó ~3.6 segundos pero funcionó ✅

---

### Ejemplo 3: Error Real (PROBLEMA)
```
🔴 PostgREST Cache Error Detected: FATAL: role "postgres" does not exist
❌ [UPDATE Incident] Failed after 3 attempts. Last error: FATAL: role "postgres" does not exist

POST /incidents/fb84d248.../update [500] 3650ms
```

**Análisis**:
- 🔴 Error real: El usuario de Supabase no existe
- ❌ Falló después de 3 reintentos (no es transitorio)
- Necesitas: Revisar credenciales en `.env`

---

## 🛠️ Cómo Verificar Que Todo Está Bien

### Test 1: Conexión a Supabase
```bash
curl -X GET http://localhost:3000/health
```

Resultado esperado:
```json
{
  "success": true,
  "message": "Servidor operativo",
  "data": { "uptime": 254.1229012 }
}
```

---

### Test 2: Operación de Lectura
```bash
curl -X GET http://localhost:3000/incidents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Resultado esperado:
```json
{
  "success": true,
  "data": [
    { "id": "...", "titulo": "...", ... }
  ]
}
```

---

### Test 3: Operación de Escritura (Retry Handler Activo)
```bash
curl -X PUT http://localhost:3000/incidents/INCIDENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"titulo": "Updated"}'
```

Resultado esperado:
```json
{
  "success": true,
  "data": { "titulo": "Updated", ... }
}
```

Si en los logs ves:
```
⚠️ [UPDATE Incident] PostgREST cache error...
✅ [UPDATE Incident] SUCCESS on retry
```

Significa que **el retry handler funcionó correctamente** ✅

---

## 📍 Archivo de Logs

- **Linux/Mac**: `/tmp/server_retry.log`
- **Windows**: `%TEMP%\server_retry.log` o `/tmp/server_retry.log`

---

## 🚨 Posibles Problemas y Dónde Verificarlos

### Problema: "No connection to database"
**Dónde ver**: Logs del servidor dirección after `npm start`
**Solución**:
1. Verifica `.env` tiene `SUPABASE_URL` y keys
2. Verifica conectividad a internet
3. Verifica que Supabase esté operativo

### Problema: "Permission denied"
**Dónde ver**: En los logs, líneas con `permission`
**Solución**:
1. Revisa RLS (Row Level Security) en Supabase
2. Verifica que el usuario tenga permisos correctos
3. Revisa roles de tabla

### Problema: "Schema cache errors persisten"
**Dónde ver**: Muchas líneas con `⚠️` y luego `❌`
**Solución**:
1. Es normal durante migraciones (se resuelve en 3-10s)
2. Si persiste más, contacta soporte Supabase
3. El retry handler maneja esto automáticamente

---

## 📈 Monitoreo Activo

Para monitoreo en tiempo real, crea este script:

```bash
#!/bin/bash
# monitor.sh
clear
while true; do
  echo "=== Errors ==="
  tail -20 /tmp/server_retry.log | grep -E "(error|Error|❌|🔴)"
  echo ""
  echo "=== Recent Requests ==="
  tail -10 /tmp/server_retry.log
  sleep 5
  clear
done
```

Ejecutar:
```bash
bash monitor.sh
```

---

## ✅ Conclusión

El retry handler está **COMPLETAMENTE INTEGRADO** y registra:
- ✅ Cuándo se detecta error de cache
- ✅ Cuántos reintentos intenta (máx 3)
- ✅ Cuándo es exitoso después de reintentos
- ✅ Cuándo falla definitivamente (problema real)

**Tu backend ahora es resiliente a cambios de schema en Supabase y registra todo para debugging.**

Cualquier error de BD será visible inmediatamente en los logs 📊
