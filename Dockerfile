#
# Development
#
FROM node:14 AS development

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . ./
RUN npm run build

#
# Production
#
FROM node:14 as production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production
COPY . ./
COPY --from=development /usr/src/app/dist ./dist/
CMD ["node", "dist/main"]
