FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server.js seed.js ./
COPY public ./public
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
