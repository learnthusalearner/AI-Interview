# Stage 1: Build Environment
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./
# Copy prisma schema so we can generate the client
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for TypeScript)
RUN npm install
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Run the build script (generates prisma client and compiles TS to JS)
RUN npm run build

# Stage 2: Production Environment
FROM node:20-alpine AS runner

WORKDIR /app

# Set Node to production mode
ENV NODE_ENV=production
ENV PORT=5000

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm install --omit=dev

# Copy the compiled typescript files from the builder stage
COPY --from=builder /app/dist ./dist

# Generate Prisma client for the production environment
RUN npx prisma generate

# Expose the correct port
EXPOSE 5000

# Start the application using the start command defined in package.json
CMD ["npm", "run", "start"]
