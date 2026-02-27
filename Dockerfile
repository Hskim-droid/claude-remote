FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      tmux \
      python3 \
      make \
      g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npx", "tsx", "server/main.ts"]
