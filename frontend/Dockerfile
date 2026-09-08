FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
EXPOSE 5173
# Dev server with host flag so the container port is reachable; proxy targets the backend service.
CMD ["npx", "vite", "--host", "0.0.0.0"]
