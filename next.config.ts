import withSerwistInit from "@serwist/next";
import { spawnSync } from "node:child_process";
import type { NextConfig } from "next";

// Using `git rev-parse HEAD` to bust the precache on every deploy.
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ??
  crypto.randomUUID();

const withSerwist = withSerwistInit({
  cacheOnNavigation: true,
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSerwist(nextConfig);
