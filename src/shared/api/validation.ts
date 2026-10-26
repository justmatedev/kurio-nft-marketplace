import { z } from 'zod'

export const emailSchema = z.email('Informe um e-mail válido')
export const nameSchema = z.string().trim().min(2, 'Mínimo 2 caracteres')
export const passwordSchema = z.string().min(8, 'Mínimo 8 caracteres')
export const quantitySchema = z.number().int('Quantidade deve ser inteira').positive('Quantidade deve ser positiva')
export const networkSchema = z.enum(['Ethereum', 'Polygon', 'Arbitrum', 'Solana'])
export const registerSchema = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema, guestId: z.string().optional() })
export const walletSchema = z.object({
  label: nameSchema, address: z.string().min(10, 'Endereço inválido'), network: networkSchema,
  email: emailSchema.nullish().or(z.literal('')),
  isPrimary: z.boolean().optional(),
  displayName: z.string().nullish(), profileName: z.string().nullish(), secondaryRef: z.string().nullish(),
  walletType: z.string().nullish(), referralCode: z.string().nullish(), ensName: z.string().nullish(), ensTld: z.string().nullish(),
}).superRefine((wallet, ctx) => {
  const valid = wallet.network === 'Solana' ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet.address) : /^0x[a-fA-F0-9]{10,40}$/.test(wallet.address)
  if (!valid) ctx.addIssue({ code: 'custom', path: ['address'], message: 'Endereço inválido para a rede' })
})
export const orderSchema = z.object({
  quoteId: z.string().min(1), collectorName: nameSchema, collectorEmail: emailSchema,
  collectorUsername: nameSchema.optional(), notes: z.string().max(2000).optional(),
  walletId: z.string().min(1, 'Selecione uma carteira'), network: networkSchema,
})
export function validationFields(error: z.ZodError) {
  return Object.fromEntries(error.issues.map(i => [i.path.join('.'), i.message]))
}

export const loginSchema = z.object({ email: emailSchema, password: passwordSchema, guestId: z.string().optional() })
export const profileSchema = z.object({
  name: nameSchema.optional(), username: nameSchema.optional(),
  ensName: z.string().nullable().optional(), ensTld: z.string().optional(),
  walletNickname: z.string().nullable().optional(), avatarUrl: z.string().nullable().optional(),
})
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1, 'Informe a senha atual'), newPassword: passwordSchema })
