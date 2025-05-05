import { defineManifest } from "@crxjs/vite-plugin";

const manifest = {
  manifest_version: 3,
  name: "LearnFlow",
  description: "Learn languages while watching videos",
  version: "0.1.0",
  permissions: ["storage", "tabs", "scripting", "offscreen", "activeTab", "identity"],
  host_permissions: ["<all_urls>"],
  icons: {
    "16": "icons/16.png",
    "48": "icons/48.png",
    "128": "icons/128.png"
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module" as const
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"],
      all_frames: true,
      run_at: "document_idle"
    }
  ],
  action: {
    default_popup: "src/ui/popup/index.html",
    default_icon: {
      "16": "icons/16.png",
      "48": "icons/48.png",
      "128": "icons/128.png"
    }
  },
  options_ui: {
    page: "src/ui/options/index.html",
    open_in_tab: true
  },
  oauth2: {
    client_id: "308237414112-4emravd51m28i8stairv7v85aq7ct6kr.apps.googleusercontent.com",
    scopes: ["https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"]
  },
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://identitytoolkit.googleapis.com https://*.google.com https://*.firebase.com https://generativelanguage.googleapis.com wss://*.firebaseio.com;"
  },
  web_accessible_resources: [
    {
      resources: ["assets/*", "*.js", "*.json", "*.css"],
      matches: ["<all_urls>"]
    }
  ]
};

export default defineManifest(manifest);
