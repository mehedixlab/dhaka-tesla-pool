# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# প্যাকেজ ফাইলগুলো কপি করে ডিপেন্ডেন্সি ইনস্টল করা
COPY package*.json ./
RUN npm install

# Prisma স্কিমা কপি করে ক্লায়েন্ট জেনারেট করা
COPY prisma ./prisma
RUN npx prisma generate

# বাকি সব কোড কপি করা
COPY . .

# পোর্ট এক্সপোজ করা
EXPOSE 5000

# ডাটাবেস মাইগ্রেশন, সিড ডেটা ইনসার্ট এবং সার্ভার চালু করা
CMD npx prisma migrate deploy && npx prisma db seed && node index.js