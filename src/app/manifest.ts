
import { MetadataRoute } from 'next'
 
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rawnak Sales',
    short_name: 'Rawnak',
    description: 'Smart sales management system for store owners in Iraq.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F0F4F7',
    theme_color: '#29ABE2',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
