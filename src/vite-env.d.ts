/// <reference types="vite/client" />

declare module '*.woff2?url' {
  const url: string;
  export default url;
}

// Build date injected by Vite `define` (see vite.config.ts).
declare const __LAST_UPDATED__: string;
