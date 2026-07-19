# Use a lightweight Node base image (no Mongo bundled).
# Node 24 (current LTS). Minimum is 22.12: sanitize-html >=2.17 and vite 8
# declare engines >=22.12.0. Node 24 images are Debian bookworm-based
# (no bullseye variant exists) and bundle corepack.
FROM node:24-bookworm-slim

# Install curl (used by healthcheck) + git, and pm2 for process management.
# pm2 is a global CLI tool, so it is installed via npm (avoids PNPM_HOME
# global-bin setup); app dependencies below are managed by pnpm.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends curl git ca-certificates; \
    npm install -g pm2; \
    apt-get clean; rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Enable pnpm via corepack (bundled with node:24). The pnpm version is pinned
# by each app's "packageManager" field in package.json — do not hardcode one here.
RUN corepack enable

# Copy and install React deps for cached builds
# (pnpm-workspace.yaml carries the supply-chain policy: minimumReleaseAge 20160
#  — pnpm 11 ignores non-auth settings in .npmrc)
COPY react/package.json react/pnpm-lock.yaml react/pnpm-workspace.yaml /React-TrashMail/react/
WORKDIR /React-TrashMail/react
RUN pnpm install --frozen-lockfile

# Copy and install mailserver deps
COPY mailserver/package.json mailserver/pnpm-lock.yaml mailserver/pnpm-workspace.yaml /React-TrashMail/mailserver/
WORKDIR /React-TrashMail/mailserver
RUN pnpm install --frozen-lockfile

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
RUN pnpm run build
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

# Run as the non-root `node` user (UID/GID 1000, shipped with the base image).
# All runtime-writable paths (.env, env.js move, first-run flag, attachments,
# PM2 home) live under /React-TrashMail, chowned here. npx/pm2 need a writable
# HOME as non-root. Binding SMTP port 25 as non-root requires
# NET_BIND_SERVICE (see docker-compose.yml) or a high SMTP_PORT.
RUN mkdir -p /React-TrashMail/mailserver/attachments \
 && chown -R node:node /React-TrashMail
ENV HOME=/React-TrashMail/mailserver

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD /healthcheck.sh

USER node
CMD ["/docker_start.sh"]
