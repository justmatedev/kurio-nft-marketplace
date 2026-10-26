import type { User, Wallet } from '@/shared/api/types'

/** Demo accounts (never real). Only SHA-256 hashes are stored — plain passwords live in README / E2E input only. */
export const DEMO_USERS = [
  {
    id: 'user_alice',
    email: 'alice@kurio.dev',
    name: 'Alice Colecionadora',
    username: 'alice',
    ensName: 'alice',
    ensTld: '.eth',
    walletNickname: 'Principal',
    avatarUrl: null as string | null,
    /** SHA-256 of Alice123! */
    passwordHash: '83cf7e374e83da2ee6ecdca58ad5b28ba38fce568bf9d2a1b9c7ae9cc1fe9e7c',
    createdAt: '2025-01-10T12:00:00.000Z',
  },
  {
    id: 'user_bob',
    email: 'bob@kurio.dev',
    name: 'Bob Trader',
    username: 'bob',
    ensName: 'bob',
    ensTld: '.eth',
    walletNickname: 'Hot wallet',
    avatarUrl: null as string | null,
    /** SHA-256 of Bob1234! */
    passwordHash: 'd9740bc9a7a7689c7c1de59e58edd7173d710a68848fff1a38c9cd1d3bc633f3',
    createdAt: '2025-02-01T12:00:00.000Z',
  },
] as const

export function toPublicUser(u: (typeof DEMO_USERS)[number]): User {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    username: u.username,
    ensName: u.ensName,
    ensTld: u.ensTld,
    walletNickname: u.walletNickname,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt,
  }
}

export const demoWallets: Record<string, Wallet[]> = {
  user_alice: [
    {
      id: 'wal_alice_1',
      label: 'Principal',
      displayName: 'Alice Colecionadora',
      profileName: 'alice',
      address: '0xA11CE000000000000000000000000000000001',
      network: 'Ethereum',
      walletType: 'MetaMask',
      email: 'alice@kurio.dev',
      ensName: 'alice',
      ensTld: '.eth',
      isPrimary: true,
    },
  ],
  user_bob: [
    {
      id: 'wal_bob_1',
      label: 'Principal',
      displayName: 'Bob Trader',
      address: '0xB0B00000000000000000000000000000000001',
      network: 'Ethereum',
      walletType: 'MetaMask',
      email: 'bob@kurio.dev',
      isPrimary: true,
    },
  ],
}
