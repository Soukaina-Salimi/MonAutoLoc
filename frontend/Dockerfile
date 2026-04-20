FROM node:20

WORKDIR /app

# Copier package.json
COPY package*.json ./

# Installer dépendances
RUN npm install

# Copier le reste
COPY . .

# Exposer port Next.js
EXPOSE 3000

# Lancer en mode dev
CMD ["npm", "run", "dev"]