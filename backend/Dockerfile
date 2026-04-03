FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy prisma schema first (needed by postinstall)
COPY prisma ./prisma/

# Install dependencies (postinstall runs prisma generate)
COPY package*.json ./
RUN npm install


# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server (use prisma migrate dev for schema changes)
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run dev"]
