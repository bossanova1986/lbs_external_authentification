# -------- Base Image for Building -------
# Use the official Node.js image as the base image
FROM node:22 AS build

# Set the working directory inside the container
WORKDIR /usr/src/app/

# Copy all source files to the image
COPY . .

# Install the application dependencies
RUN npm i
RUN npm audit fix 2>&1 > /deploy/deploy.log || echo "Errors while performing audit fix for api"
#RUN npm upgrade jwa

# Build application
RUN npm run build

# Prod-Only Deps prunen
RUN npm prune --omit=dev

# ------------ Runtime Image -------------
# Use the official Node.js image as the base image
FROM node:22 AS runtime

# ---- Backend ----
WORKDIR /usr/src/app/

# Copy distributables from build container
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
#COPY --from=build /usr/src/app/auth-api/config ./config

# Copy environment file
COPY ./env.template .
COPY ./package.json .

# copy run script
COPY ./docker_assignment/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# create unprivileged user 
# ALPINE
# RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs 
# DEBIAN
RUN groupadd -r nodejs && useradd -r -g nodejs nodeuser 
RUN chown nodeuser:nodejs /usr/src/app/

EXPOSE 3000

#HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
#  CMD wget -qO- http://localhost:1080$BASE_HREF/api/config/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]