#!/bin/sh

# Generate the runtime environment file served at /env-config.js. index.html
# loads it before the Angular bundle, which merges
# window.__FORKED_RUNTIME_ENV__ over the compiled environment defaults (see
# src/environments/environment.ts). Unset variables yield empty strings, which
# keep the related features disabled.
json_str() {
  # Strip characters that could break out of the double-quoted JS string.
  printf '%s' "${1}" | tr -d '"\\\r\n'
}

cat > /identity/env-config.js <<EOF
// Generated at container startup by run.sh; do not edit. Set the container
// environment variables WALLET_CONNECT_PROJECT_ID / GOOGLE_DRIVE_CLIENT_ID.
window.__FORKED_RUNTIME_ENV__ = {
  walletConnectProjectId: "$(json_str "${WALLET_CONNECT_PROJECT_ID:-}")",
  googleDriveClientId: "$(json_str "${GOOGLE_DRIVE_CLIENT_ID:-}")"
};
EOF

echo "Loading Caddy config from file: ${CADDY_FILE}"

caddy run --config ${CADDY_FILE}
