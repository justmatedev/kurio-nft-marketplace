/** Responsive WebP variants generated from Figma PNG exports (~2 MB → ~30–75 KB). */

export function nftImageSources(imageUrl: string) {
  const base = imageUrl.replace(/-640\.(webp|png)$/i, '').replace(/\.(webp|png)$/i, '')
  return {
    src: `${base}.webp`,
    srcSet: `${base}-640.webp 640w, ${base}.webp 960w`,
  }
}
