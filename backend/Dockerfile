FROM node:20-alpine
WORKDIR /usr/src/app
# Install OpenSSL compatibility library for Prisma
RUN apk add --no-cache openssl libssl3
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]
