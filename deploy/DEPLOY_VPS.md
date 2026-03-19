# Deploy En VPS Con Nginx Y HTTPS

Esta guia asume:

- Ubuntu en un VPS
- Docker y Docker Compose instalados
- Nginx instalado en el host
- Un dominio o subdominio apuntando al servidor, por ejemplo `api.tudominio.com`

## 1. Preparar el codigo

```bash
sudo mkdir -p /opt/sentinel-backend
sudo chown $USER:$USER /opt/sentinel-backend
cd /opt/sentinel-backend
git clone <TU_REPO_GIT> .
cp .env.example .env
```

Completa `.env` con tus credenciales reales de Supabase.

Opcionalmente puedes fijar estos valores:

```env
HOST_BIND_IP=127.0.0.1
HOST_PORT=3000
```

## 2. Levantar el backend

```bash
cd /opt/sentinel-backend
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:3000/health
```

El backend debe quedar accesible solo de forma local en el servidor.

## 3. Configurar Nginx

Copia la plantilla incluida en el repo:

```bash
sudo cp deploy/nginx/sentinel-backend.conf /etc/nginx/sites-available/sentinel-backend
```

Edita `server_name` y reemplaza `api.example.com` por tu dominio real:

```bash
sudo nano /etc/nginx/sites-available/sentinel-backend
```

Activa el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/sentinel-backend /etc/nginx/sites-enabled/sentinel-backend
sudo nginx -t
sudo systemctl reload nginx
```

## 4. Emitir HTTPS con Let's Encrypt

Instala Certbot si hace falta:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

Emite y configura el certificado:

```bash
sudo certbot --nginx -d api.tudominio.com
```

Verifica la renovacion automatica:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

## 5. Firewall recomendado

Si usas UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw deny 3000
sudo ufw enable
sudo ufw status
```

En Oracle Cloud tambien debes abrir `80` y `443` en la Security List o Network Security Group de la subred.

## 6. Operacion diaria

Actualizar despliegue:

```bash
cd /opt/sentinel-backend
git pull
docker compose up -d --build
```

Ver logs:

```bash
docker compose logs -f api
```

Reiniciar:

```bash
docker compose restart api
```

## 7. Recomendaciones importantes

- No dejes `3000` expuesto publicamente. Nginx debe ser la unica entrada desde internet.
- Rota cualquier credencial real que haya quedado expuesta fuera de tu entorno privado, especialmente `SUPABASE_SERVICE_ROLE_KEY`.
- Ubuntu 20.04.6 LTS quedo fuera de soporte estandar el 31 de mayo de 2025. Conviene planificar migracion a Ubuntu 22.04 LTS o 24.04 LTS.
