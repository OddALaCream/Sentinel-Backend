FROM node:20-alpine AS api-deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force


FROM node:20-alpine AS api

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=api-deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY src ./src

RUN chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "const http=require('http');const req=http.get('http://127.0.0.1:'+process.env.PORT+'/health',res=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));req.setTimeout(4000,()=>{req.destroy();process.exit(1);});"

CMD ["node", "src/server.js"]


FROM python:3.11-slim AS rag-builder

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
	build-essential \
	git \
 && rm -rf /var/lib/apt/lists/*

COPY RAG_HACKATON_SENTINEL/requirements.txt /app/RAG_HACKATON_SENTINEL/requirements.txt
RUN python -m venv /opt/venv \
 && /opt/venv/bin/pip install --upgrade pip \
 && /opt/venv/bin/pip install --no-cache-dir -r /app/RAG_HACKATON_SENTINEL/requirements.txt


FROM python:3.11-slim AS rag

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	PATH="/opt/venv/bin:$PATH" \
	PORT=8000

WORKDIR /app/RAG_HACKATON_SENTINEL

RUN groupadd --system app && useradd --system --gid app --create-home app

COPY --from=rag-builder /opt/venv /opt/venv
COPY RAG_HACKATON_SENTINEL/ /app/RAG_HACKATON_SENTINEL/

RUN chown -R app:app /app/RAG_HACKATON_SENTINEL

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD python -c "import os,sys,urllib.request;port=os.getenv('PORT','8000');url=f'http://127.0.0.1:{port}/health';\
try:\
 r=urllib.request.urlopen(url, timeout=4); sys.exit(0 if r.status==200 else 1)\
except Exception:\
 sys.exit(1)"

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
