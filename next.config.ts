import path from "node:path";
import type { NextConfig } from "next";

const root = process.cwd();
const isomorphicWs = path.join(root, "lib", "isomorphic-ws.ts");
const nm = (...parts: string[]) => path.join(root, "node_modules", ...parts);

// Force a single browser WASM instance per package — dual copies break instanceof (StateValue).
const ledgerBrowser = nm("@midnight-ntwrk", "ledger-v8", "midnight_ledger_wasm.js");
const onchainBrowser = nm(
  "@midnight-ntwrk",
  "onchain-runtime-v3",
  "midnight_onchain_runtime_wasm.js",
);
const compactRuntime = nm("@midnight-ntwrk", "compact-runtime");

const midnightWasm = [
  "@midnight-ntwrk/compact-js",
  "@midnight-ntwrk/compact-runtime",
  "@midnight-ntwrk/ledger-v8",
  "@midnight-ntwrk/onchain-runtime-v3",
  "@midnight-ntwrk/midnight-js-contracts",
  "@midnight-ntwrk/midnight-js-protocol",
];

const nextConfig: NextConfig = {
  serverExternalPackages: midnightWasm,
  turbopack: {
    resolveAlias: {
      "isomorphic-ws": "./lib/isomorphic-ws.ts",
      "@midnight-ntwrk/ledger-v8": "./node_modules/@midnight-ntwrk/ledger-v8/midnight_ledger_wasm.js",
      "@midnight-ntwrk/onchain-runtime-v3":
        "./node_modules/@midnight-ntwrk/onchain-runtime-v3/midnight_onchain_runtime_wasm.js",
      "@midnight-ntwrk/compact-runtime": "./node_modules/@midnight-ntwrk/compact-runtime",
    },
  },
  webpack: (config, { isServer, webpack }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
    };
    config.output = {
      ...config.output,
      environment: {
        ...(config.output?.environment ?? {}),
        asyncFunction: true,
      },
    };
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "isomorphic-ws": isomorphicWs,
      "@midnight-ntwrk/ledger-v8": ledgerBrowser,
      "@midnight-ntwrk/onchain-runtime-v3": onchainBrowser,
      "@midnight-ntwrk/compact-runtime": compactRuntime,
    };
    config.resolve.conditionNames = [
      "browser",
      "import",
      "module",
      "require",
      "default",
    ];
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "");
      }),
    );
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        fs: false,
        path: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
