# Use the Node.js official image as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json files to the container
COPY package*.json ./

# Install the application dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Expose the port the WebSocket server runs on
EXPOSE 2000

# Start the NestJS application
CMD ["npm", "run", "start"]
