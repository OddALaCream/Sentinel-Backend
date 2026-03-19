FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY src ./src

RUN chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "const http=require('http');const req=http.get('http://127.0.0.1:'+process.env.PORT+'/health',res=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));req.setTimeout(4000,()=>{req.destroy();process.exit(1);});"

CMD ["node", "src/server.js"]
