import { useSessionGuard } from '@/features/auth/session-guard'
import { profileSchema, changePasswordSchema, validationFields } from '@/shared/api/validation'
import { QueryRefresh, QueryError, QueryLoading, focusFirstError } from '@/shared/ui/query-state'
import { useOwnerId } from '@/shared/api/query-keys'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AccountShell, RequiredMark, profileFieldClass } from '@/features/account/account-shell'
import { requireAuth } from '@/features/auth/require-auth'
import { endpoints } from '@/shared/api/endpoints'
import { getApiError } from '@/shared/api/client'
import { cn } from '@/shared/lib/utils'

export const Route = createFileRoute('/profile')({
  beforeLoad: () => requireAuth('/profile'),
  component: ProfilePage,
})

const ENS_TLDS = ['.eth', '.xyz', '.crypto'] as const

function ProfilePage() {
  const ownerId = useOwnerId()
  const isCurrentSession = useSessionGuard()
  const queryClient = useQueryClient()
  const profileQuery = useQuery({ queryKey: ['profile', ownerId], queryFn: ({ signal }) => endpoints.profile(signal) })
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [ensName, setEnsName] = useState('')
  const [ensTld, setEnsTld] = useState<string>('.eth')
  const [walletNickname, setWalletNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!profileQuery.data) return
    const u = profileQuery.data
    setName(u.name)
    setUsername(u.username)
    setEmail(u.email)
    setEnsName(u.ensName ?? '')
    setEnsTld(u.ensTld || '.eth')
    setWalletNickname(u.walletNickname ?? '')
    setAvatarUrl(u.avatarUrl)
  }, [profileQuery.data])

  const saveProfile = useMutation({
    mutationFn: () =>
      endpoints.updateProfile({
        name: name.trim(),
        username: username.trim(),
        ensName: ensName.trim() || null,
        ensTld,
        walletNickname: walletNickname.trim() || null,
        avatarUrl,
      }),
    onSuccess: (user) => {
      if (!isCurrentSession()) return
      void queryClient.setQueryData(['profile', ownerId], user)
      void queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })

  const savePassword = useMutation({
    mutationFn: () =>
      endpoints.changePassword({ currentPassword, newPassword }),
  })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validated = profileSchema.safeParse({ name, username })
    const next: Record<string, string> = validated.success ? {} : validationFields(validated.error)

    const wantsPassword = Boolean(currentPassword || newPassword || confirmPassword)
    if (wantsPassword) {
      const password = changePasswordSchema.safeParse({ currentPassword, newPassword })
      if (!password.success) Object.assign(next, validationFields(password.error))
      if (newPassword !== confirmPassword) next.confirmPassword = 'As senhas não coincidem'
    }

    setFieldErrors(next)
    if (Object.keys(next).length) { focusFirstError(); return }

    setPending(true)
    try {
      await saveProfile.mutateAsync()
      if (!isCurrentSession()) return
      if (wantsPassword) {
        await savePassword.mutateAsync()
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
      toast.success('Perfil atualizado')
    } catch (err) {
      const apiErr = getApiError(err)
      if (apiErr.fields) setFieldErrors(apiErr.fields)
      toast.error(apiErr.message)
    } finally {
      setPending(false)
    }
  }

  const onPickAvatar = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setAvatarUrl(reader.result)
    }
    reader.readAsDataURL(file)
  }

  if (profileQuery.isLoading) return <QueryLoading label="Carregando perfil" />
  if (profileQuery.isError && !profileQuery.data) return <QueryError error={profileQuery.error} retry={() => { void profileQuery.refetch() }} />

  return (
    <AccountShell title="Perfil do colecionador">
      <QueryRefresh fetching={profileQuery.isFetching} error={profileQuery.error} retry={() => { void profileQuery.refetch() }} />
      <form className="max-w-[640px] space-y-8" onSubmit={onSubmit} noValidate>
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="display-name"
              label="Nome de exibição"
              required
              value={name}
              error={fieldErrors.name}
              onChange={setName}
            />
            <Field
              id="username"
              label="Nome de usuário"
              required
              value={username}
              error={fieldErrors.username}
              onChange={setUsername}
              autoComplete="username"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="email"
              label="E-mail"
              required
              type="email"
              value={email}
              error={fieldErrors.email}
              onChange={setEmail}
              autoComplete="email"
              readOnly
            />
            <div>
              <label htmlFor="ens-name" className="mb-2 block text-sm text-foreground">
                Nome ENS <RequiredMark />
              </label>
              <div className="flex overflow-hidden rounded-[6px] border border-[#3d2e24] focus-within:border-text-accent">
                <select
                  aria-label="Sufixo ENS"
                  className="h-11 border-r border-[#3d2e24] bg-transparent px-3 text-sm text-foreground outline-none"
                  value={ensTld}
                  onChange={(e) => setEnsTld(e.target.value)}
                >
                  {ENS_TLDS.map((tld) => (
                    <option key={tld} value={tld} className="bg-[#140d0a]">
                      {tld}
                    </option>
                  ))}
                </select>
                <input
                  id="ens-name"
                  value={ensName}
                  onChange={(e) => setEnsName(e.target.value)}
                  placeholder="nome"
                  className="h-11 min-w-0 flex-1 bg-transparent px-3.5 text-sm text-foreground outline-none placeholder:text-placeholder"
                />
              </div>
            </div>
          </div>

          <Field
            id="wallet-nickname"
            label="Apelido da carteira"
            required
            value={walletNickname}
            error={fieldErrors.walletNickname}
            onChange={setWalletNickname}
          />

          <div>
            <p className="mb-3 text-sm text-foreground">Avatar</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[#3d2e24] bg-[#1a1410]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserRound className="h-7 w-7 text-placeholder" strokeWidth={1.5} />
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                className="inline-flex h-10 items-center rounded-[6px] bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
                onClick={() => fileRef.current?.click()}
              >
                Alterar
              </button>
              <button
                type="button"
                className="text-sm text-foreground/80 transition hover:text-foreground"
                onClick={() => {
                  setAvatarUrl(null)
                  if (fileRef.current) fileRef.current.value = ''
                }}
              >
                Remover
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <h2 className="text-base font-bold text-foreground">Alterar senha</h2>
          <PasswordField
            id="current-password"
            label="Senha atual"
            value={currentPassword}
            show={showCurrent}
            error={fieldErrors.currentPassword}
            autoComplete="current-password"
            onToggle={() => setShowCurrent((v) => !v)}
            onChange={setCurrentPassword}
          />
          <PasswordField
            id="new-password"
            label="Nova senha"
            value={newPassword}
            show={showNew}
            error={fieldErrors.newPassword}
            autoComplete="new-password"
            onToggle={() => setShowNew((v) => !v)}
            onChange={setNewPassword}
          />
          <PasswordField
            id="confirm-password"
            label="Confirmar nova senha"
            value={confirmPassword}
            show={showConfirm}
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
            onToggle={() => setShowConfirm((v) => !v)}
            onChange={setConfirmPassword}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 min-w-[140px] items-center justify-center rounded-[6px] bg-primary px-8 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
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
  autoComplete,
  readOnly,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  required?: boolean
  type?: string
  autoComplete?: string
  readOnly?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-foreground">
        {label} {required ? <RequiredMark /> : null}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        readOnly={readOnly}
        value={value}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(profileFieldClass, readOnly && 'opacity-80')}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <p id={`${id}-error`} className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  error,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  error?: string
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
          className={cn(profileFieldClass, 'pr-11')}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="absolute top-1/2 right-3 -translate-y-1/2 text-text-accent hover:text-primary"
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          onClick={onToggle}
        >
          {show ? (
            <Eye className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <EyeOff className="h-4 w-4" strokeWidth={1.75} />
          )}
        </button>
      </div>
      {error ? <p id={`${id}-error`} className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
