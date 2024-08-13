const fs = require('fs');
const path = require('path');

// Define your configuration template
const config = {
  "build": {
    "env": {
      "SUPABASE_URL": process.env.SUPABASE_URL,
      "SUPABASE_ANON_KEY": process.env.SUPABASE_ANON_KEY,
      "SECRET_KEY": process.env.SECRET_KEY
    }
  }
};

// Write the configuration to a JSON file
const configPath = path.resolve(__dirname, 'electron-builder-config.json');
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log('Electron-builder configuration has been generated.');
