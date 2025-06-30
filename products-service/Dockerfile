# Use official Node.js base image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install deps
COPY package*.json ./
RUN npm install 

# Copy the rest of the app
COPY . .

# Expose service port
EXPOSE 3001

# Start the app
CMD ["npm", "start"]

