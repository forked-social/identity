/**
 * Local-only public key derivation for the forked-social network.
 *
 * Mirrors identity's canonical key derivation EXACTLY (see
 * src/app/crypto.service.ts: mnemonicToKeychain / privateKeyToDeSoPublicKey and
 * src/app/entropy.service.ts: isValidMnemonic), so a given mnemonic +
 * passphrase produces the same key the identity UI would produce on
 * "Log in > Seed phrase" (or for sub-accounts, the same key identity derives
 * for account number N).
 *
 * Derivation (identical to CryptoService):
 *   seed     = bip39.mnemonicToSeedSync(mnemonic, passphrase)  // passphrase == identity's "extraText"
 *   keychain = hdkey.fromMasterSeed(seed).derive("m/44'/0'/N'/0/0", false)
 *   pubkey   = secp256k1 compressed public key of keychain.privateKey (33 bytes)
 *   encoded  = base58check(pubkeyPrefix (3 bytes) || pubkey)
 *
 * The network prefix bytes below MUST stay in sync with
 * CryptoService.PUBLIC_KEY_PREFIXES in src/app/crypto.service.ts.
 *   mainnet: [0x05, 0x01, 0xed] -> keys lead with "FS1..."
 *   testnet: [0x11, 0xc8, 0x7d] -> keys lead with "tFS..."
 *
 * This script performs LOCAL computation only: it makes zero network calls,
 * contains no telemetry, and never logs secrets (mnemonics, passphrases, or
 * private keys). It prints only the derived public key(s), one per line, in
 * input order.
 *
 * Usage (run from the identity project directory):
 *   npm run derive-keys -- "mnemonic words here"
 *   npm run derive-keys -- --testnet "mnemonic words here"
 *   npm run derive-keys -- --passphrase "bip39 passphrase" "mnemonic words here"
 *   npm run derive-keys -- --account 2 "mnemonic words here"
 *   npm run derive-keys -- --file mnemonics.txt            (see below)
 *
 * --file lines are one of:
 *   <mnemonic>                       (empty passphrase)
 *   <mnemonic>::<bip39 passphrase>   (per-mnemonic passphrase)
 * and may contain blank lines and #-prefixed comments.
 */

// This script is executed with ts-node --project scripts/tsconfig.json, which
// overrides module=commonjs and enables esModuleInterop so default imports of
// CommonJS packages (hdkey, bs58check) work at runtime. It must also keep
// type-checking under the root tsconfig (module=es2020, used by the repo's
// quality gate), where allowSyntheticDefaultImports covers these imports.
import * as bip39 from 'bip39';
import bs58check from 'bs58check';
import { ec as EC } from 'elliptic';
import * as fs from 'fs';
import HDKey from 'hdkey';

// Keep in sync with CryptoService.PUBLIC_KEY_PREFIXES (src/app/crypto.service.ts).
const PUBLIC_KEY_PREFIXES = {
  mainnet: [0x05, 0x01, 0xed],
  testnet: [0x11, 0xc8, 0x7d],
};

interface MnemonicInput {
  mnemonic: string;
  passphrase: string;
  label: string; // non-secret identifier for error messages
}

function usage(): never {
  console.error(`Usage:
  npm run derive-keys -- [flags] "mnemonic words here" ["another mnemonic" ...]
  npm run derive-keys -- [flags] --file <path>

Flags:
  --testnet            Derive testnet-style keys (prefix tFS... instead of FS1...)
  --passphrase <text>  BIP39 passphrase applied to every mnemonic passed
                       positionally (identity calls this "extra text")
  --account <n>        Sub-account number N (default 0, the "Log in with seed"
                       account). Uses identity's path m/44'/0'/N'/0/0
  --file <path>        File with one mnemonic per line, optionally followed by
                       ::passphrase. Blank lines and #-comments are ignored.
  --help               Show this help

Output: one public key per line, in input order. Nothing else is logged.`);
  process.exit(2);
}

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

// Mirrors identity's derivation. See crypto.service.ts mnemonicToKeychain and
// privateKeyToDeSoPublicKey.
function derivePublicKey(
  mnemonic: string,
  passphrase: string,
  network: 'mainnet' | 'testnet',
  accountNumber: number
): string {
  const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
  // We are using a customized version of hdkey and the derive signature types
  // are not compatible with the "nonStandard" flag. Hence the ts-ignore.
  const keychain = HDKey.fromMasterSeed(seed).derive(
    `m/44'/0'/${accountNumber}'/0/0`,
    // @ts-ignore
    false
  );
  const ec = new EC('secp256k1');
  const keyPair = ec.keyFromPrivate(keychain.privateKey);
  const key = keyPair.getPublic().encode('array', true);
  const prefix = PUBLIC_KEY_PREFIXES[network];
  return bs58check.encode(Buffer.from([...prefix, ...key]));
}

// Mirrors entropy.service.ts isValidMnemonic.
function isValidMnemonic(mnemonic: string): boolean {
  try {
    bip39.mnemonicToEntropy(mnemonic);
  } catch {
    return false;
  }
  return true;
}

function parseArgs(argv: string[]): {
  network: 'mainnet' | 'testnet';
  accountNumber: number;
  inputs: MnemonicInput[];
} {
  const inputs: MnemonicInput[] = [];
  let network: 'mainnet' | 'testnet' = 'mainnet';
  let accountNumber = 0;
  let passphrase: string | null = null;
  let file: string | null = null;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--help':
      case '-h':
        usage();
        break;
      case '--testnet':
        network = 'testnet';
        break;
      case '--passphrase':
        if (i + 1 >= argv.length) {
          fail('--passphrase requires a value');
        }
        passphrase = argv[++i];
        break;
      case '--account':
        if (i + 1 >= argv.length) {
          fail('--account requires a value');
        }
        const n = parseInt(argv[++i], 10);
        if (isNaN(n) || n < 0 || !Number.isInteger(n)) {
          fail('--account must be a non-negative integer');
        }
        accountNumber = n;
        break;
      case '--file':
        if (i + 1 >= argv.length) {
          fail('--file requires a path');
        }
        file = argv[++i];
        break;
      default:
        if (arg.startsWith('--')) {
          fail(`unknown flag ${arg}`);
        }
        positional.push(arg);
        break;
    }
  }

  if (file) {
    let contents: string;
    try {
      contents = fs.readFileSync(file, 'utf8');
    } catch (e) {
      fail(`cannot read file (path withheld): ${(e as Error).message}`);
    }
    contents.split('\n').forEach((rawLine, idx) => {
      const line = rawLine.trim();
      if (line.length === 0 || line.startsWith('#')) {
        return;
      }
      const separatorIdx = line.indexOf('::');
      let mnemonic: string;
      let linePassphrase: string;
      if (separatorIdx === -1) {
        mnemonic = line.trim();
        linePassphrase = '';
      } else {
        mnemonic = line.slice(0, separatorIdx).trim();
        linePassphrase = line.slice(separatorIdx + 2);
      }
      if (!isValidMnemonic(mnemonic)) {
        fail(`invalid mnemonic at file line ${idx + 1}`);
      }
      inputs.push({
        mnemonic,
        passphrase: linePassphrase,
        label: `file line ${idx + 1}`,
      });
    });
  }

  positional.forEach((mnemonic, idx) => {
    if (!isValidMnemonic(mnemonic)) {
      fail(`invalid mnemonic at argument ${idx + 1}`);
    }
    inputs.push({
      mnemonic,
      passphrase: passphrase ?? '',
      label: `argument ${idx + 1}`,
    });
  });

  if (inputs.length === 0) {
    usage();
  }

  return { network, accountNumber, inputs };
}

function main(): void {
  const { network, accountNumber, inputs } = parseArgs(process.argv.slice(2));
  for (const input of inputs) {
    // Only the public key is ever printed. Mnemonics, passphrases, and
    // private keys (seed hex) are intentionally never logged.
    const publicKey = derivePublicKey(
      input.mnemonic,
      input.passphrase,
      network,
      accountNumber
    );
    console.log(publicKey);
  }
}

main();
