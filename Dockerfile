FROM oven/bun:1.3 AS base
WORKDIR /app

# Install dependencies first
COPY apps/web/package.json apps/web/bun.lock ./apps/web/
# Use --backend=copy to ensure native bindings are fetched inside linux container
RUN cd apps/web && bun install --backend=copy

# Copy source
COPY . .

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["bun", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
