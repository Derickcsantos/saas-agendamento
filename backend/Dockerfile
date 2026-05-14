# Dockerfile para Google Cloud Run
# Build: gcloud builds submit --tag gcr.io/PROJECT_ID/IMAGE_NAME
# Deploy: gcloud run deploy SERVICE_NAME --image gcr.io/PROJECT_ID/IMAGE_NAME

FROM node:20.11.0-alpine

# Definir workdir
WORKDIR /workspace

# Copiar package.json e package-lock.json
COPY package*.json ./

# Limpar cache npm e instalar dependências (sem devDependencies em produção)
RUN npm cache clean --force && \
    npm ci --omit=dev --legacy-peer-deps

# Copiar resto do código
COPY . .

# Cloud Run escuta na porta definida por PORT, padrão 8080
# Mas nossa app usa 3000, então precisa ouvir em 8080
ENV PORT=8080
ENV NODE_ENV=production

# Expor porta
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Comando para iniciar
CMD ["node", "server.js"]
