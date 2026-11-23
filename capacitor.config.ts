import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.kostpro.app',
  appName: 'KOSTPRO',
  webDir: 'www',
  server: {
    url: 'https://kostpro.vercel.app',
    cleartext: false,
    allowNavigation: ['kostpro.vercel.app'],
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
