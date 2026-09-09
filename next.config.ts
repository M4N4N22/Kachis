import path from "node:path";
import type { NextConfig } from "next";

const isomorphicWs = path.join(process.cwd(), "lib", "isomorphic-ws.ts");

const midnightWasm = [
  "@midnight-ntwrk/compact-js",
  "@midnight-ntwrk/compact-runtime",
  "@midnight-ntwrk/ledger-v8",
  "@midnight-ntwrk/midnight-js-contracts",
  "@midnight-ntwrk/midnight-js-protocol",
];

const nextConfig: NextConfig = {
  serverExternalPackages: midnightWasm,
  turbopack: {
    resolveAlias: {
      "isomorphic-ws": "./lib/isomorphic-ws.ts",
    },
  },
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "isomorphic-ws": isomorphicWs,
    };
    return config;
  },
};

export default nextConfig;
