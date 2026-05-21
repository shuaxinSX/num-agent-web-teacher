# Stage 1: Build React/Vite Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
# Copy the local speech SDK tarball which is listed in dependencies
COPY byted-ailab-speech-sdk-4.0.10.tgz ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Setup Express Backend & Run
FROM node:20-alpine AS runner
WORKDIR /app

# Install dependencies needed for SQLite native compilation if necessary, 
# although node-sqlite3 usually provides prebuilt binaries for alpine.
RUN apk add --no-cache python3 make g++

# Copy server package configuration
COPY server/package.json ./server/
WORKDIR /app/server
RUN npm install --production

# Copy backend source files
COPY server/src ./src

# Copy static frontend build from Stage 1 into server/public
COPY --from=frontend-builder /app/dist ./public

# Configure production environment variables
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

# Setup persistent directory for SQLite database
RUN mkdir -p /app/server/data
ENV SQLITE_DB_PATH=/app/server/data/database.sqlite

CMD ["npm", "start"]
