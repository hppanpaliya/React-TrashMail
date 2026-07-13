# Use a lightweight Node base image (no Mongo bundled)
FROM node:20-bullseye-slim

# The node:20-bullseye-slim base already ships Node 20 and yarn.
# Install curl (used by healthcheck) + git, and pm2 for process management.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends curl git ca-certificates; \
    yarn global add pm2; \
    apt-get clean; rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copy and install React deps for cached builds
COPY react/package.json react/yarn.lock /React-TrashMail/react/
WORKDIR /React-TrashMail/react
RUN yarn install --frozen-lockfile

# Copy and install mailserver deps
COPY mailserver/package.json mailserver/yarn.lock /React-TrashMail/mailserver/
WORKDIR /React-TrashMail/mailserver
RUN yarn install --frozen-lockfile

# Copy application code (Vite builds from index.html + vite.config.js at the react root)
COPY react/src /React-TrashMail/react/src
COPY react/public /React-TrashMail/react/public
COPY react/index.html react/vite.config.js react/jsconfig.json /React-TrashMail/react/

COPY mailserver/server.js /React-TrashMail/mailserver/
COPY mailserver/src /React-TrashMail/mailserver/src
COPY mailserver/scripts /React-TrashMail/mailserver/scripts
COPY mailserver/jest-config.js /React-TrashMail/mailserver/
COPY mailserver/jest-setup.js /React-TrashMail/mailserver/

# Build React
WORKDIR /React-TrashMail/react
RUN yarn build
RUN rm -rf /React-TrashMail/react/node_modules/

# Copy react build into mailserver build dir
WORKDIR /React-TrashMail/mailserver
RUN rm -rf src/build/* || true
RUN mkdir -p src/build
RUN cp -r ../react/build/* src/build/

# Expose port and mount attachments volume
ENV PORT=4000
ENV TRUST_PROXY=2
VOLUME ["/React-TrashMail/mailserver/attachments"]

# Default MONGO_URI can be overridden in compose / cloud env
ENV MONGO_URI=mongodb://mongo:27017
ENV DB_NAME=myemails

# Startup + healthcheck
COPY docker_start.sh /docker_start.sh
RUN chmod +x /docker_start.sh
COPY healthcheck.sh /healthcheck.sh
RUN chmod +x /healthcheck.sh

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD /healthcheck.sh

CMD ["/docker_start.sh"]
