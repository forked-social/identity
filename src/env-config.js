// Default runtime environment for the identity app.
//
// index.html loads this BEFORE the Angular bundle so that
// window.__FORKED_RUNTIME_ENV__ is available when the environment module
// evaluates (see src/environments/environment.ts).
//
// In containers run.sh REGENERATES this file at startup from the
// WALLET_CONNECT_PROJECT_ID / GOOGLE_DRIVE_CLIENT_ID environment variables.
// Empty values keep the related features disabled.
//
// Local dev: set values here, or define window.__FORKED_RUNTIME_ENV__ in an
// index.html override before this script loads.
window.__FORKED_RUNTIME_ENV__ = window.__FORKED_RUNTIME_ENV__ || {
  walletConnectProjectId: '',
  googleDriveClientId: '',
};
