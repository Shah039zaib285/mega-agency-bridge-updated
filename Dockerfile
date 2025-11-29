FROM node:20-slim

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
CMD ["node", "src/server.js"]
