FROM node:22-alpine
WORKDIR /srv/app
COPY app/ ./
USER node
EXPOSE 8080
CMD ["node", "--no-warnings", "index.js"]
