FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
COPY server.js ./
RUN mkdir -p uploads/faces uploads/classroom uploads/temp logs
EXPOSE 5000
CMD ["node", "server.js"]
