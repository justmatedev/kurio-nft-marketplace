import Decimal from 'decimal.js'

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP })

export function eth(value: string | number | Decimal): Decimal {
  return new Decimal(value)
}

export function formatEth(value: string | number | Decimal, digits = 4): string {
  const amount = eth(value)
  return amount.toFixed(Math.max(digits, amount.decimalPlaces()))
}

export function addEth(...values: Array<string | number | Decimal>): string {
  return values.reduce<Decimal>((acc, v) => acc.plus(eth(v)), eth(0)).toFixed()
}

export function mulEth(value: string | number | Decimal, qty: number): string {
  return eth(value).times(qty).toFixed()
}

export function subEth(a: string | number | Decimal, b: string | number | Decimal): string {
  return eth(a).minus(eth(b)).toFixed()
}
