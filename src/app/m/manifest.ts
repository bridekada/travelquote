import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TravelQuote V2',
    short_name: 'TravelQuote',
    description: 'Multi-operator Travel Agency Quote Builder',
    start_url: '/m',
    scope: '/m',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#003829',
    theme_color: '#00674F',
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcuts: [
      { name: 'New Quote', short_name: 'New Quote', url: '/m/builder' },
      { name: 'Dashboard', short_name: 'Dashboard', url: '/m/dashboard' },
    ],
  };
}
