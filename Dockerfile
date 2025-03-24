# Sử dụng Node.js 18 làm base image
FROM node:18

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Sao chép package.json và package-lock.json trước để cache dependencies
COPY package.json package-lock.json ./

# Cài đặt dependencies
RUN npm install

# Sao chép toàn bộ source code vào container
COPY . .

# Mở cổng 3001
EXPOSE 3001

# Chạy ứng dụng
CMD ["npm", "start"]
