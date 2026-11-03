FROM node:22-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY app/ .
USER node
CMD ["node", "server.js"]
