import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addEth, mulEth, subEth, eth, formatEth } from './eth.ts'

test('preserva wei e descontos sem converter ETH para ponto flutuante', () => {
  assert.equal(addEth('0.1', '0.2'), '0.3')
  assert.equal(mulEth('0.123456789123456789', 3), '0.370370367370370367')
  const discounted = eth('9.123456789123456789').times('0.9').toFixed()
  assert.equal(addEth(discounted, '0.0025'), '8.2136111102111111101')
  assert.equal(subEth('1', '0.000000000000000001'), '0.999999999999999999')
})

test('apresentação mantém toda a precisão da cotação', () => {
  assert.equal(formatEth('0.0025', 3), '0.0025')
  assert.equal(formatEth('9.123456789123456789', 2), '9.123456789123456789')
})
