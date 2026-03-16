FROM oven/bun:1.3 AS base
WORKDIR /app

# Install dependencies first
COPY apps/web/package.json apps/web/bun.lock ./apps/web/
RUN cd apps/web && bun install

# Copy source
COPY . .

EXPOSE 3000
CMD ["bun", "--cwd", "/app/apps/web", "run", "dev", "--host", "0.0.0.0", "--port", "3000"]
