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

const mlRuntime = [
  "@huggingface/transformers",
  "onnxruntime-web",
  "onnxruntime-node",
  "sharp",
];

const nextConfig: NextConfig = {
  serverExternalPackages: [...midnightWasm, ...mlRuntime],
  turbopack: {
    resolveAlias: {
      // Keep absolute so Turbopack does not fall back to isomorphic-ws/browser.js
      "isomorphic-ws": isomorphicWs.replace(/\\/g, "/"),
      "@midnight-ntwrk/ledger-v8": ledgerBrowser.replace(/\\/g, "/"),
      "@midnight-ntwrk/onchain-runtime-v3": onchainBrowser.replace(/\\/g, "/"),
      "@midnight-ntwrk/compact-runtime": compactRuntime.replace(/\\/g, "/"),
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
    // Prefer the app root node_modules — nested shared/node_modules breaks native ML binaries.
    config.resolve.modules = [
      path.join(root, "node_modules"),
      "node_modules",
    ];
    config.resolve.alias = {
      ...config.resolve.alias,
      "isomorphic-ws": isomorphicWs,
      "@midnight-ntwrk/ledger-v8": ledgerBrowser,
      "@midnight-ntwrk/onchain-runtime-v3": onchainBrowser,
      "@midnight-ntwrk/compact-runtime": compactRuntime,
    };
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
        resource.request = resource.request.replace(/^node:/, "");
      }),
    );
    // Native N-API binaries must never be parsed by webpack.
    config.externals = config.externals ?? [];
    if (Array.isArray(config.externals)) {
      config.externals.push(
        "onnxruntime-node",
        "sharp",
        (
          { request }: { request?: string },
          callback: (err?: Error | null, result?: string) => void,
        ) => {
          // Do not match React's `server.node` modules — only native ML packages.
          if (
            request === "sharp" ||
            request === "onnxruntime-node" ||
            (typeof request === "string" &&
              request.includes("onnxruntime-node") &&
              request.endsWith(".node"))
          ) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      );
    }
    if (!isServer) {
      // Prefer browser exports only on the client. Doing this on the server
      // pulls DOM builds (e.g. decode-named-character-reference → document).
      config.resolve.conditionNames = [
        "browser",
        "import",
        "module",
        "require",
        "default",
      ];
      config.resolve.alias = {
        ...config.resolve.alias,
        sharp$: false,
        "onnxruntime-node$": false,
      };
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        fs: false,
        path: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        module: false,
      };
    }
    return config;
  },
};

export default nextConfig;
