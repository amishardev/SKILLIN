import type { MetadataRoute } from 'next';

/**
 * Next.js serves this at /manifest.webmanifest and links it automatically.
 * The icons are the same mark as the tab icon: `app/icon.png` is emitted with a
 * hashed name, so the manifest points at the stable public copy instead.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SkillIn by Amish Sharma',
    short_name: 'SkillIn',
    description: 'What should I learn next?',
    start_url: '/app',
    display: 'standalone',
    background_color: '#B7C1BC',
    theme_color: '#17191D',
    icons: [
      { src: '/brand/skillin-app-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/skillin-app-icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
