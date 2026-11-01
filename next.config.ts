import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // hides the floating "N" badge in development (it sat on top of the phone tab bar); compile and runtime errors still show
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
