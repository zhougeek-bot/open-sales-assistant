FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3100

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p data uploads

EXPOSE 3100

CMD ["npm", "start"]
