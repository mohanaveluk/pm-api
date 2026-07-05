# Stage 1: Build the application
FROM node:24-alpine as builder

# Create and set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./
COPY tsconfig.json tsconfig.json
COPY nest-cli.json nest-cli.json

# Copy the rest of the application code to the working directory
COPY . .


# Install dependencies
RUN npm install

# Build the NestJS application
RUN npm run build

# Stage 2: Create the production image
FROM node:24-alpine

# Create and set the working directory
WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./

# Copy database migrations
##COPY --from=builder /app/src/database/migrations ./dist/database/migrations

# Install only production dependencies
RUN npm install --only=production

# Create the logs directory and set permissions
#RUN mkdir -p /app/logs && chown -R node:node /app/logs

# Add a non-root user and switch to it
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create the logs directory and set permissions
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app/logs

# Switch to the non-root user
USER appuser

# Add a debugging step
RUN ls -l /app && ls -l /app/logs

# Set production environment
ENV NODE_ENV=production

# The port that Cloud Run will use
ENV PORT=8080

# Add wait-for-it script for database connection
#COPY wait-for-it.sh /wait-for-it.sh
#RUN chmod +x /wait-for-it.sh

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD nc -z localhost $PORT || exit 1

# Expose the port the app runs on
EXPOSE 8080

# Define the command to run the application
#CMD ["node", "dist/main"]
CMD ["npm", "run", "start:prod"]
