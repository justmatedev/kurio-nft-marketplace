import assert from 'node:assert/strict'
import { test } from 'node:test'
import { quantitySchema, orderSchema, walletSchema, registerSchema } from './validation.ts'

test('API e formulário rejeitam frações, valores não positivos e cadastro inválido', () => {
  for (const value of [0, -1, 1.5, NaN, Infinity, '2']) assert.equal(quantitySchema.safeParse(value).success, false)
  assert.equal(quantitySchema.safeParse(2).success, true)
  assert.equal(registerSchema.safeParse({ name: 'A', email: 'invalid', password: 'short' }).success, false)
})
test('carteira depende da rede e pedido exige cotação explícita', () => {
  const wallet = { label: 'Wallet', address: '0xABCDEF1234567890', network: 'Ethereum' }
  assert.equal(walletSchema.safeParse(wallet).success, true)
  assert.equal(walletSchema.safeParse({ ...wallet, network: 'Solana' }).success, false)
  assert.equal(orderSchema.safeParse({ collectorName: 'Alice', collectorEmail: 'alice@example.com', walletId: 'wallet', network: 'Ethereum' }).success, false)
})
