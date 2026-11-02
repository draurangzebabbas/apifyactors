# Apify base image — Node 24 + Playwright Chromium pre-installed
# https://crawlee.dev/docs/guides/docker-images
FROM apify/actor-node-playwright-chrome:24-1.61.1

# Check preinstalled packages
RUN npm ls apify playwright

# Copy package files first (Docker layer cache)
COPY --chown=myuser:myuser package*.json ./

# Install only production dependencies
# Playwright browser binaries are already in the base image — no download needed
RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version \
    && rm -r ~/.npm

# Copy source code
COPY --chown=myuser:myuser . ./

CMD ["node", "src/main.js"]
