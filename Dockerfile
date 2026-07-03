FROM oven/bun:1

WORKDIR /app

# Prisma's CLI runs a Node version check (>=20.19) that Bun's runtime doesn't
# reliably satisfy (see CLAUDE.md's "Prisma client generation" note), so a
# real Node is installed just for the `prisma generate` step below. Bun stays
# the runtime for installing dependencies, building the client, and serving
# the app.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends curl ca-certificates openssl \
  && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

COPY . .

# bun.lock is gitignored in this repo, so there's no lockfile to freeze against.
RUN bun install

RUN node server/node_modules/prisma/build/index.js generate --schema=server/prisma/schema.prisma
RUN bun run --cwd client build

ENV NODE_ENV=production
EXPOSE 3000


# `bunx prisma` (unpinned) resolves the latest Prisma CLI (v7, a breaking
# schema-syntax change) instead of this project's v5 devDependency, so
# migrate deploy runs through the same locally-installed CLI as generate.
CMD ["sh", "-c", "node server/node_modules/prisma/build/index.js migrate deploy --schema=server/prisma/schema.prisma && bun run --cwd server start"]
