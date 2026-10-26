import type { Nft } from '@/shared/api/types'

/** Figma assets (WebP) — recycled across catalog like the design comps. */
const NFT_IMAGES = [
  '/nfts/emerald-ape.webp',
  '/nfts/violet-nomad.webp',
  '/nfts/cosmic-bloom.webp',
  '/nfts/ivory-baron.webp',
] as const

const NFT_NAMES = [
  'Emerald Ape',
  'Violet Nomad',
  'Cosmic Bloom',
  'Ivory Baron',
] as const

/**
 * Contagens exatas da sidebar do Figma (Coleções).
 * Total = 239. Redes no Figma somam 283 (inconsistente); distribuímos
 * as 239 peças na mesma proporção Ethereum/Polygon/Solana.
 */
const COLLECTION_QUOTAS: ReadonlyArray<{ label: string; count: number }> = [
  { label: 'Arte digital', count: 33 },
  { label: 'Fotografia', count: 12 },
  { label: 'Música', count: 65 },
  { label: 'Arte 3D', count: 39 },
  { label: 'Colecionáveis', count: 23 },
  { label: 'Generativa', count: 17 },
  { label: 'Jogos', count: 19 },
  { label: 'Assinaturas', count: 13 },
  { label: 'Utilidade', count: 18 },
]

/** Proporção Figma 119 : 78 : 86 sobre 239 itens → 101 + 66 + 72. */
const NETWORK_QUOTAS: ReadonlyArray<{ label: string; count: number }> = [
  { label: 'Ethereum', count: 101 },
  { label: 'Polygon', count: 66 },
  { label: 'Solana', count: 72 },
]

function expandQuotas(quotas: ReadonlyArray<{ label: string; count: number }>): string[] {
  const out: string[] = []
  for (const q of quotas) {
    for (let i = 0; i < q.count; i++) out.push(q.label)
  }
  return out
}

/** Embaralha com seed fixa para redes misturadas sem alterar as cotas. */
function shuffleInPlace<T>(arr: T[], seed = 42): T[] {
  let s = seed
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

const collectionBag = expandQuotas(COLLECTION_QUOTAS)
const networkBag = shuffleInPlace(expandQuotas(NETWORK_QUOTAS))

if (collectionBag.length !== networkBag.length) {
  throw new Error(
    `Fixture size mismatch: collections=${collectionBag.length} networks=${networkBag.length}`,
  )
}

function buildNft(i: number): Nft {
  const n = i + 1
  const collection = collectionBag[i]!
  const network = networkBag[i]!
  const base = (0.08 + (i % 9) * 0.037).toFixed(3)
  const available = Math.max(0, 12 - (i % 13))
  const imgIndex = i % NFT_IMAGES.length
  const img = NFT_IMAGES[imgIndex]!
  const displayName = NFT_NAMES[imgIndex]!
  const number = 800 + n
  const gallery = [
    img,
    NFT_IMAGES[(imgIndex + 1) % NFT_IMAGES.length]!,
    NFT_IMAGES[(imgIndex + 2) % NFT_IMAGES.length]!,
    NFT_IMAGES[(imgIndex + 3) % NFT_IMAGES.length]!,
  ]
  const priceOpen = base
  const price50 = (Number(base) * 1.15).toFixed(3)
  const price10 = (Number(base) * 1.55).toFixed(3)
  const price1 = (Number(base) * 2.8).toFixed(3)
  return {
    id: `nft_${String(n).padStart(3, '0')}`,
    slug: `${displayName.toLowerCase().replace(/\s+/g, '-')}-${number}`,
    name: `${displayName} #${number}`,
    collection,
    description: `Peça digital finalizada à mão da coleção Kurio Editions. Cada edição carrega assinatura on-chain do criador e metadados permanentes em IPFS, com atributos únicos da categoria ${collection}.`,
    imageUrl: img,
    gallery,
    creator: i % 2 === 0 ? 'Studio Verde' : 'Atelier Mint',
    version: 1,
    featured: i < 6,
    tags: [
      displayName.split(' ')[0]!,
      i % 3 === 0 ? 'Esmeralda' : i % 3 === 1 ? 'Neon' : 'Marfim',
      i % 2 === 0 ? 'Raro' : 'Edição',
    ],
    network,
    editions: [
      {
        id: `ed_${String(n).padStart(3, '0')}_1`,
        label: '1/1',
        available: available > 0 && i % 7 === 0 ? 1 : 0,
        total: 1,
        priceEth: price1,
      },
      {
        id: `ed_${String(n).padStart(3, '0')}_10`,
        label: '1/10',
        available: Math.min(10, available),
        total: 10,
        priceEth: price10,
      },
      {
        id: `ed_${String(n).padStart(3, '0')}_50`,
        label: '1/50',
        available: Math.min(50, Math.max(available, 1)),
        total: 50,
        priceEth: price50,
      },
      {
        id: `ed_${String(n).padStart(3, '0')}_open`,
        label: 'ABERTA',
        available: Math.max(available, 8),
        total: 500,
        priceEth: priceOpen,
      },
    ],
    createdAt: new Date(Date.UTC(2025, 0, 1 + (i % 28))).toISOString(),
  }
}

export const nftFixtures: Nft[] = Array.from({ length: collectionBag.length }, (_, i) =>
  buildNft(i),
)
