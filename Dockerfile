FROM node:20-alpine As development

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

###################
# BUILD FOR PRODUCTION
###################

FROM node:20-alpine As build

WORKDIR /usr/src/app

COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules

COPY --chown=node:node loadTools.js ./
COPY --chown=node:node avr_tools ./avr_tools
COPY --chown=node:node tools ./tools
COPY --chown=node:node index.js ./

USER node

CMD [ "node", "index.js" ]