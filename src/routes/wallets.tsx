import { useSessionGuard } from '@/features/auth/session-guard'
import { walletSchema, validationFields } from '@/shared/api/validation'
import { QueryRefresh, QueryError, QueryLoading, focusFirstError } from '@/shared/ui/query-state'
import { useOwnerId } from '@/shared/api/query-keys'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AccountShell, RequiredMark, profileFieldClass } from '@/features/account/account-shell'
import { requireAuth } from '@/features/auth/require-auth'
import { endpoints } from '@/shared/api/endpoints'
import { getApiError } from '@/shared/api/client'
import type { Wallet } from '@/shared/api/types'
import { cn } from '@/shared/lib/utils'

export const Route = createFileRoute('/wallets')({
  beforeLoad: () => requireAuth('/wallets'),
  component: WalletsPage,
})

const NETWORKS = ['Ethereum', 'Polygon', 'Solana', 'Arbitrum'] as const
const WALLET_TYPES = ['MetaMask', 'WalletConnect', 'Coinbase', 'Ledger', 'Outra'] as const
const ENS_TLDS = ['.eth', '.xyz', '.crypto'] as const

type FormState = {
  id?: string
  displayName: string
  label: string
  network: string
  profileName: string
  address: string
  secondaryRef: string
  walletType: string
  referralCode: string
  email: string
  ensName: string
  ensTld: string
}

const emptyForm = (email = ''): FormState => ({
  displayName: '',
  label: '',
  network: '',
  profileName: '',
  address: '',
  secondaryRef: '',
  walletType: '',
  referralCode: '',
  email,
  ensName: '',
  ensTld: '.eth',
})

function fromWallet(w: Wallet, fallbackEmail = ''): FormState {
  return {
    id: w.id,
    displayName: w.displayName ?? w.label,
    label: w.label,
    network: w.network,
    profileName: w.profileName ?? '',
    address: w.address,
    secondaryRef: w.secondaryRef ?? '',
    walletType: w.walletType ?? '',
    referralCode: w.referralCode ?? '',
    email: w.email ?? fallbackEmail,
    ensName: w.ensName ?? '',
    ensTld: w.ensTld ?? '.eth',
  }
}

function toPayload(form: FormState, isPrimary: boolean): Omit<Wallet, 'id'> {
  return {
    label: form.label.trim() || form.displayName.trim() || 'Carteira',
    address: form.address.trim(),
    network: form.network,
    isPrimary,
    displayName: form.displayName.trim() || null,
    profileName: form.profileName.trim() || null,
    secondaryRef: form.secondaryRef.trim() || null,
    walletType: form.walletType || null,
    referralCode: form.referralCode.trim() || null,
    email: form.email.trim() || null,
    ensName: form.ensName.trim() || null,
    ensTld: form.ensTld || '.eth',
  }
}

function WalletsPage() {
  const ownerId = useOwnerId()
  const isCurrentSession = useSessionGuard()
  const queryClient = useQueryClient()
  const walletsQuery = useQuery({ queryKey: ['wallets', ownerId], queryFn: ({ signal }) => endpoints.wallets(signal) })
  const profileQuery = useQuery({ queryKey: ['profile', ownerId], queryFn: ({ signal }) => endpoints.profile(signal) })

  const wallets = walletsQuery.data ?? []
  const primary = useMemo(
    () => wallets.find((w) => w.isPrimary) ?? wallets[0] ?? null,
    [wallets],
  )
  const secondary = useMemo(
    () => wallets.find((w) => !w.isPrimary && w.id !== primary?.id) ?? null,
    [wallets, primary?.id],
  )

  const [primaryForm, setPrimaryForm] = useState<FormState>(() => emptyForm())
  const [secondaryForm, setSecondaryForm] = useState<FormState | null>(null)
  const [showSecondaryForm, setShowSecondaryForm] = useState(false)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [secondaryErrors, setSecondaryErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const email = profileQuery.data?.email ?? ''
    if (primary) setPrimaryForm(fromWallet(primary, email))
    else setPrimaryForm(emptyForm(email))
  }, [primary, profileQuery.data?.email])

  useEffect(() => {
    if (secondary) {
      setSecondaryForm(fromWallet(secondary, profileQuery.data?.email ?? ''))
      setShowSecondaryForm(true)
      setSameAsPrimary(false)
    }
  }, [secondary, profileQuery.data?.email])

  const saveMutation = useMutation({
    mutationFn: async ({
      form,
      isPrimary,
    }: {
      form: FormState
      isPrimary: boolean
    }) => {
      const body = toPayload(form, isPrimary)
      if (form.id) return endpoints.updateWallet(form.id, body)
      return endpoints.createWallet(body)
    },
    onSuccess: () => {
      if (!isCurrentSession()) return
      void queryClient.invalidateQueries({ queryKey: ['wallets', ownerId] })
      toast.success('Carteira salva')
    },
    onError: (e) => {
      if (!isCurrentSession()) return
      const err = getApiError(e)
      if (err.fields) setErrors(err.fields)
      toast.error(err.message)
    },
  })

  const saveSecondaryMutation = useMutation({
    mutationFn: async (form: FormState) => {
      const body = toPayload(form, false)
      if (form.id) return endpoints.updateWallet(form.id, body)
      return endpoints.createWallet(body)
    },
    onSuccess: () => {
      if (!isCurrentSession()) return
      void queryClient.invalidateQueries({ queryKey: ['wallets', ownerId] })
      toast.success('Carteira secundária salva')
      setShowSecondaryForm(true)
    },
    onError: (e) => {
      if (!isCurrentSession()) return
      const err = getApiError(e)
      if (err.fields) setSecondaryErrors(err.fields)
      toast.error(err.message)
    },
  })

  const patchPrimary = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setPrimaryForm((f) => ({ ...f, [key]: value }))
  }

  const startSecondary = (copyPrimary: boolean) => {
    const email = profileQuery.data?.email ?? ''
    if (copyPrimary && primary) {
      setSecondaryForm({
        ...fromWallet(primary, email),
        id: secondary?.id,
        label: primary.label ? `${primary.label} (cópia)` : 'Secundária',
        displayName: primary.displayName
          ? `${primary.displayName} (cópia)`
          : primary.label || 'Secundária',
      })
      setSameAsPrimary(true)
    } else {
      setSecondaryForm(emptyForm(email))
      setSameAsPrimary(false)
    }
    setShowSecondaryForm(true)
    setSecondaryErrors({})
  }

  if (walletsQuery.isLoading || profileQuery.isLoading) return <QueryLoading label="Carregando carteiras" />
  if ((walletsQuery.isError && !walletsQuery.data) || (profileQuery.isError && !profileQuery.data)) return <QueryError error={walletsQuery.error ?? profileQuery.error} retry={() => { void walletsQuery.refetch(); void profileQuery.refetch() }} />

  return (
    <AccountShell>
      <QueryRefresh fetching={walletsQuery.isFetching || profileQuery.isFetching} error={walletsQuery.error ?? profileQuery.error} retry={() => { void walletsQuery.refetch(); void profileQuery.refetch() }} />
      <div className="max-w-[860px] space-y-12">
        {/* Primary */}
        <section>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight text-foreground sm:text-[32px]">
                Carteira principal
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">
                Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
              </p>
            </div>
            <button
              type="button"
              className="text-sm font-medium text-text-accent hover:text-primary"
              onClick={() => {
                setPrimaryForm(emptyForm(profileQuery.data?.email ?? ''))
                setErrors({})
              }}
            >
              Adicionar
            </button>
          </div>

          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              setErrors({})
              const parsed = walletSchema.safeParse(toPayload(primaryForm, true))
                const next = parsed.success ? {} : validationFields(parsed.error)
                setErrors(next)
              if (Object.keys(next).length) { focusFirstError(); return }
              saveMutation.mutate({ form: primaryForm, isPrimary: true })
            }}
            noValidate
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                id="display-name"
                label="Nome de exibição"
                required
                value={primaryForm.displayName}
                error={errors.displayName}
                onChange={(v) => patchPrimary('displayName', v)}
              />
              <Field
                id="label"
                label="Apelido da carteira"
                required
                value={primaryForm.label}
                error={errors.label}
                onChange={(v) => patchPrimary('label', v)}
              />
              <SelectField
                id="network"
                label="Rede"
                required
                value={primaryForm.network}
                placeholder="Selecione uma rede"
                error={errors.network}
                options={NETWORKS}
                onChange={(v) => patchPrimary('network', v)}
              />
              <Field
                id="profile-name"
                label="Nome do perfil"
                required
                value={primaryForm.profileName}
                error={errors.profileName}
                onChange={(v) => patchPrimary('profileName', v)}
              />
              <Field
                id="address"
                label="Endereço da carteira"
                required
                value={primaryForm.address}
                placeholder="Endereço 0x da carteira"
                error={errors.address}
                onChange={(v) => patchPrimary('address', v)}
              />
              <Field
                id="secondary-ref"
                label="ENS ou carteira secundária"
                value={primaryForm.secondaryRef}
                placeholder="ENS ou carteira secundária (opcional)"
                onChange={(v) => patchPrimary('secondaryRef', v)}
              />
              <SelectField
                id="wallet-type"
                label="Tipo de carteira"
                required
                value={primaryForm.walletType}
                placeholder="Selecione uma carteira"
                error={errors.walletType}
                options={WALLET_TYPES}
                onChange={(v) => patchPrimary('walletType', v)}
              />
              <Field
                id="referral"
                label="Código de indicação"
                value={primaryForm.referralCode}
                onChange={(v) => patchPrimary('referralCode', v)}
              />
              <Field
                id="wallet-email"
                label="E-mail"
                required
                type="email"
                value={primaryForm.email}
                error={errors.email}
                onChange={(v) => patchPrimary('email', v)}
              />
              <EnsField
                ensName={primaryForm.ensName}
                ensTld={primaryForm.ensTld}
                onName={(v) => patchPrimary('ensName', v)}
                onTld={(v) => patchPrimary('ensTld', v)}
              />
            </div>

            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex h-11 min-w-[160px] items-center justify-center rounded-[6px] bg-primary px-8 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Salvando…' : 'Salvar carteira'}
            </button>
          </form>
        </section>

        {/* Secondary */}
        <section className="border-t border-foreground/10 pt-10">
          <h2 className="text-xl font-bold text-foreground">Carteira secundária</h2>

          {!showSecondaryForm && !secondary ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-text-secondary">
                Você ainda não adicionou uma carteira secundária.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="same-as-primary"
                    checked={sameAsPrimary}
                    className="size-4 accent-primary"
                    onChange={() => setSameAsPrimary(true)}
                  />
                  Igual à carteira principal
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-text-accent hover:text-primary"
                  onClick={() => startSecondary(sameAsPrimary)}
                >
                  Adicionar
                </button>
              </div>
            </div>
          ) : (
            <form
              className="mt-6 space-y-5"
              onSubmit={(e) => {
                e.preventDefault()
                if (!secondaryForm) return
                setSecondaryErrors({})
                const parsed = walletSchema.safeParse(toPayload(secondaryForm, false))
                const next = parsed.success ? {} : validationFields(parsed.error)
                setSecondaryErrors(next)
                if (Object.keys(next).length) { focusFirstError(); return }
                saveSecondaryMutation.mutate(secondaryForm)
              }}
              noValidate
            >
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  className="text-sm font-medium text-text-accent hover:text-primary"
                  onClick={() => startSecondary(false)}
                >
                  Adicionar
                </button>
              </div>
              {secondaryForm ? (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      id="sec-display-name"
                      label="Nome de exibição"
                      required
                      value={secondaryForm.displayName}
                      onChange={(v) => setSecondaryForm((f) => (f ? { ...f, displayName: v } : f))}
                    />
                    <Field
                      id="sec-label"
                      label="Apelido da carteira"
                      required
                      value={secondaryForm.label}
                      error={secondaryErrors.label}
                      onChange={(v) => setSecondaryForm((f) => (f ? { ...f, label: v } : f))}
                    />
                    <SelectField
                      id="sec-network"
                      label="Rede"
                      required
                      value={secondaryForm.network}
                      placeholder="Selecione uma rede"
                      error={secondaryErrors.network}
                      options={NETWORKS}
                      onChange={(v) => setSecondaryForm((f) => (f ? { ...f, network: v } : f))}
                    />
                    <Field
                      id="sec-address"
                      label="Endereço da carteira"
                      required
                      value={secondaryForm.address}
                      placeholder="Endereço 0x da carteira"
                      error={secondaryErrors.address}
                      onChange={(v) => setSecondaryForm((f) => (f ? { ...f, address: v } : f))}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saveSecondaryMutation.isPending}
                    className="inline-flex h-11 min-w-[160px] items-center justify-center rounded-[6px] bg-primary px-8 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saveSecondaryMutation.isPending ? 'Salvando…' : 'Salvar carteira'}
                  </button>
                </>
              ) : null}
            </form>
          )}
        </section>
      </div>
    </AccountShell>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  required,
  type = 'text',
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  required?: boolean
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-foreground">
        {label}
        {required ? (
          <>
            {' '}
            <RequiredMark />
          </>
        ) : null}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={profileFieldClass}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <p id={`${id}-error`} className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  placeholder: string
  required?: boolean
  error?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-foreground">
        {label}
        {required ? (
          <>
            {' '}
            <RequiredMark />
          </>
        ) : null}
      </label>
      <select
        id={id}
        value={value}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(profileFieldClass, 'appearance-none')}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" className="bg-[#140d0a]">
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-[#140d0a]">
            {opt}
          </option>
        ))}
      </select>
      {error ? <p id={`${id}-error`} className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function EnsField({
  ensName,
  ensTld,
  onName,
  onTld,
}: {
  ensName: string
  ensTld: string
  onName: (v: string) => void
  onTld: (v: string) => void
}) {
  return (
    <div>
      <label htmlFor="wallet-ens" className="mb-2 block text-sm text-foreground">
        Nome ENS <RequiredMark />
      </label>
      <div className="flex overflow-hidden rounded-[6px] border border-[#3d2e24] focus-within:border-text-accent">
        <select
          aria-label="Sufixo ENS"
          className="h-11 border-r border-[#3d2e24] bg-transparent px-3 text-sm text-foreground outline-none"
          value={ensTld}
          onChange={(e) => onTld(e.target.value)}
        >
          {ENS_TLDS.map((tld) => (
            <option key={tld} value={tld} className="bg-[#140d0a]">
              {tld}
            </option>
          ))}
        </select>
        <input
          id="wallet-ens"
          value={ensName}
          placeholder="nome"
          className="h-11 min-w-0 flex-1 bg-transparent px-3.5 text-sm text-foreground outline-none placeholder:text-placeholder"
          onChange={(e) => onName(e.target.value)}
        />
      </div>
    </div>
  )
}
