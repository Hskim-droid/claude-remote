FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      tmux \
      python3 \
      make \
      g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npx", "tsx", "server/main.ts"]
