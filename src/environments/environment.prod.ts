// Runtime overrides: index.html loads /env-config.js (a plain asset) before
// the Angular bundle; it defines window.__FORKED_RUNTIME_ENV__. In containers
// run.sh regenerates that file at startup from environment variables. Unset
// values fall back to empty-string defaults below (feature stays disabled).
const runtimeEnv: { [key: string]: string } =
  (typeof window !== 'undefined' && (window as any).__FORKED_RUNTIME_ENV__) ||
  {};

export const environment = {
  production: true,
  // The canonical host of this identity service on the forked.social network.
  hostname: 'https://identity.forked.social',
  // The fork node (TLS-proxied to the backend API port; use the domain with no
  // port suffix).
  nodeURL: 'https://node.forked.social',
  fullAccessHostnames: ['forked.social', 'localhost'],
  noAccessHostnames: [''],
  jumioSupported: false,
  // Buy/swap provider disabled: heroswap only settles against the OLD DeSo
  // network. An empty URL disables all HeroSwap iframes/flows.
  heroswapURL: '',
  // No hCaptcha account is registered for the fork. With an empty sitekey the
  // captcha widget cannot render; captcha-based starter $DESO flows stay
  // disabled unless the backend reports a captcha reward anyway.
  hCaptchaSitekey: '',
  // WalletConnect project id (register at cloud.walletconnect.com). Supplied
  // at runtime via WALLET_CONNECT_PROJECT_ID (see /env-config.js above).
  // Empty = mobile WalletConnect pairing disabled (see metamask.service.ts).
  walletConnectProjectId: runtimeEnv.walletConnectProjectId || '',
  // Google OAuth client id (drive.appdata scope) enabling the "back up seed
  // to Google Drive" feature. Supplied at runtime via GOOGLE_DRIVE_CLIENT_ID.
  // Empty = feature hidden/disabled (see google-drive.service.ts).
  googleDriveClientId: runtimeEnv.googleDriveClientId || '',
};
