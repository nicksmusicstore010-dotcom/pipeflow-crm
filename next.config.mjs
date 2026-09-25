/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets a verification build (`NEXT_DIST_DIR=.next-verify npm run build`) run
  // without overwriting the `.next` folder a running `npm run dev` is using —
  // that breaks the dev server with "Cannot find module './NNN.js'".
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
