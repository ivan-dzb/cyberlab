# Plantilla de reto. Base mínima con versión fijada; usuario no-root; sin secretos.
FROM node:22-alpine
WORKDIR /srv/app
COPY app/ ./
USER node
EXPOSE 8080
CMD ["node", "index.js"]
