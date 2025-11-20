FROM node:20-alpine
WORKDIR /usr/src/app
# Install OpenSSL compatibility library for Prisma
RUN apk add --no-cache openssl libssl3
COPY package*.json ./
RUN npm ci
# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate
# Copy source code and build
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["npm", "start"]
