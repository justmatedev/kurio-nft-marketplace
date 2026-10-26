import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { hashPassword, verifyPassword } from './password.ts'

describe('password', () => {
  it('hashes Alice123! to the known fixture digest', async () => {
    const h = await hashPassword('Alice123!')
    assert.equal(
      h,
      '83cf7e374e83da2ee6ecdca58ad5b28ba38fce568bf9d2a1b9c7ae9cc1fe9e7c',
    )
  })

  it('hashes Bob1234! to the known fixture digest', async () => {
    const h = await hashPassword('Bob1234!')
    assert.equal(
      h,
      'd9740bc9a7a7689c7c1de59e58edd7173d710a68848fff1a38c9cd1d3bc633f3',
    )
  })

  it('verifies matching plain and rejects mismatch', async () => {
    const h = await hashPassword('Bob1234!')
    assert.equal(await verifyPassword('Bob1234!', h), true)
    assert.equal(await verifyPassword('wrong', h), false)
  })
})
