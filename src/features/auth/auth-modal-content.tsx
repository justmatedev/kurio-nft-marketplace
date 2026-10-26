import { loginSchema, registerSchema, validationFields } from '@/shared/api/validation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Eye, EyeOff, X } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/session'
import { useAuthModal } from '@/features/auth/auth-modal'
import { getApiError } from '@/shared/api/client'
import { focusFirstError } from '@/shared/ui/query-state'
import { cn } from '@/shared/lib/utils'

const inputClass = 'h-12 w-full rounded-[6px] border border-[#3d2e24] bg-transparent px-3.5 text-sm text-white outline-none placeholder:text-[#b39463] transition-colors focus:border-primary aria-[invalid=true]:border-destructive'

export default function AuthModal() {
  const { state, closeAuth, openAuth } = useAuthModal()
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const triggerRef = useRef<HTMLElement | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!state.open) return
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setName('')
    setShowPassword(false)
    setShowConfirm(false)
    setErrors({})
    setPending(false)
  }, [state.open, state.mode])

  const finish = useCallback(() => {
    closeAuth()
    const target = state.redirectTo && state.redirectTo.startsWith('/') ? state.redirectTo : null
    if (target) void navigate({ to: target })
  }, [closeAuth, navigate, state.redirectTo])

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!email.trim()) next.email = 'Informe o e-mail'
    if (!password) next.password = 'Informe a senha'
    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) for (const [key, message] of Object.entries(validationFields(parsed.error))) next[key] ??= message
    setErrors(next)
    if (Object.keys(next).length) { focusFirstError(); return }
    setPending(true)
    try {
      await login(email.trim(), password)
      toast.success('Sessão iniciada')
      finish()
    } catch (err) {
      toast.error(getApiError(err).message)
    } finally {
      setPending(false)
    }
  }

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Informe o nome de usuário'
    if (!email.trim()) next.email = 'Informe o e-mail'
    const parsed = registerSchema.safeParse({ name, email, password })
    if (!parsed.success) Object.assign(next, validationFields(parsed.error))
    if (password !== confirmPassword) next.confirmPassword = 'As senhas não coincidem'
    setErrors(next)
    if (Object.keys(next).length) { focusFirstError(); return }
    setPending(true)
    try {
      await register({ name: name.trim(), email: email.trim(), password })
      toast.success('Conta criada')
      finish()
    } catch (err) {
      const apiErr = getApiError(err)
      if (apiErr.fields) setErrors(apiErr.fields)
      toast.error(apiErr.message)
    } finally {
      setPending(false)
    }
  }

  if (!state.open || typeof document === 'undefined') return null

  const isLogin = state.mode === 'login'
  const submitClass =
    'mt-1 flex h-12 w-full items-center justify-center rounded-[8px] bg-primary text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 md:h-11 md:rounded-[6px]'

  return (
    <Dialog.Root open={state.open} onOpenChange={open => { if (!open) closeAuth() }}>
    <Dialog.Portal>
    <div
      className={cn(
        'fixed inset-0 z-[100] flex',
        'items-stretch justify-stretch p-0 md:items-center md:justify-center md:p-4',
      )}
    >
      <Dialog.Overlay className="absolute inset-0 bg-background md:bg-black/75" />
      <Dialog.Content
        aria-describedby={undefined}
        onOpenAutoFocus={() => { triggerRef.current = document.activeElement as HTMLElement | null }}
        onCloseAutoFocus={event => { event.preventDefault(); triggerRef.current?.focus() }}
        className={cn(
          'relative z-10 flex w-full flex-col overflow-y-auto bg-background px-6 pb-10 pt-14',
          'md:h-auto md:max-h-[min(92dvh,720px)] md:max-w-[400px] md:rounded-[10px]',
          'md:bg-[#140d0a] md:px-8 md:pb-9 md:pt-10 md:shadow-[0_24px_64px_rgba(0,0,0,0.55)]',
        )}
      >
        <Dialog.Title className="sr-only">{isLogin ? 'Entrar' : 'Criar perfil de colecionador'}</Dialog.Title>
        <button
          type="button"
          onClick={closeAuth}
          className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center text-[#b39463] hover:text-[#d1894d]"
          aria-label="Fechar"
        >
          <X className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>

        {/* Mobile brand (Figma) — branco só em marca / título / rodapé / sociais */}
        <div className="mb-10 text-center md:hidden">
          <p className="text-[1.75rem] font-extrabold tracking-[0.18em] text-white uppercase">
            KURIO
          </p>
          <p className="mt-6 text-base font-medium text-white">
            {isLogin ? 'Entrar' : 'Criar perfil de colecionador'}
          </p>
        </div>

        {/* Desktop tabs */}
        <div
          className="mb-4 hidden items-center justify-center gap-2.5 md:flex"
          role="tablist"
          aria-label="Autenticação"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isLogin}
            className={cn(
              'text-[17px] font-medium tracking-tight transition-colors',
              isLogin ? 'text-text-accent' : 'text-foreground/80 hover:text-foreground',
            )}
            onClick={() => openAuth('login', state.redirectTo)}
          >
            Entrar
          </button>
          <span className="select-none text-[17px] text-foreground/35" aria-hidden>
            |
          </span>
          <button
            type="button"
            role="tab"
            aria-selected={!isLogin}
            className={cn(
              'text-[17px] font-medium tracking-tight transition-colors',
              !isLogin ? 'text-text-accent' : 'text-foreground/80 hover:text-foreground',
            )}
            onClick={() => openAuth('register', state.redirectTo)}
          >
            Criar conta
          </button>
        </div>

        <p className="mb-7 hidden text-center text-[13px] leading-5 text-foreground/90 md:block">
          {isLogin
            ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.'
            : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}
        </p>

        {isLogin ? (
          <form className="space-y-3.5" onSubmit={onLogin} noValidate>
            <Field
              id="auth-email"
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="contato@email.com"
              value={email}
              error={errors.email}
              onChange={setEmail}
            />
            <div>
              <PasswordField
                id="auth-password"
                label="Senha"
                autoComplete="current-password"
                placeholder="***********"
                value={password}
                show={showPassword}
                error={errors.password}
                onToggle={() => setShowPassword((v) => !v)}
                onChange={setPassword}
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="text-[12px] text-[#d1894d] hover:text-[#e89b55]"
                  onClick={() => toast.message('Recuperação de senha em breve')}
                >
                  Esqueceu a senha?
                </button>
              </div>
            </div>
            <button type="submit" disabled={pending} className={submitClass}>
              {pending ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        ) : (
          <form className="space-y-3.5" onSubmit={onRegister} noValidate>
            <Field
              id="auth-name"
              label="Nome de usuário"
              autoComplete="username"
              placeholder="Nome de usuário"
              value={name}
              error={errors.name}
              onChange={setName}
            />
            <Field
              id="auth-email-reg"
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="Digite seu e-mail"
              value={email}
              error={errors.email}
              onChange={setEmail}
            />
            <PasswordField
              id="auth-password-reg"
              label="Senha"
              autoComplete="new-password"
              placeholder="Senha"
              value={password}
              show={showPassword}
              error={errors.password}
              onToggle={() => setShowPassword((v) => !v)}
              onChange={setPassword}
            />
            <PasswordField
              id="auth-confirm"
              label="Confirmar senha"
              autoComplete="new-password"
              placeholder="Confirmar senha"
              value={confirmPassword}
              show={showConfirm}
              error={errors.confirmPassword}
              onToggle={() => setShowConfirm((v) => !v)}
              onChange={setConfirmPassword}
            />
            <button type="submit" disabled={pending} className={submitClass}>
              {pending ? 'Criando…' : (
                <>
                  <span className="md:hidden">Criar perfil</span>
                  <span className="hidden md:inline">Criar conta</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="my-7 flex items-center gap-3 md:my-7">
          <div className="h-px flex-1 bg-[#3d2e24]" />
          <span className="shrink-0 text-[12px] text-[#b39463]">Ou continue com</span>
          <div className="h-px flex-1 bg-[#3d2e24]" />
        </div>

        <div className="space-y-3">
          <SocialButton
            label="Continuar com Google"
            onClick={() => toast.message('Login com Google em breve')}
            icon={<GoogleIcon />}
          />
          <SocialButton
            label="Continuar com Facebook"
            onClick={() => toast.message('Login com Facebook em breve')}
            icon={<FacebookIcon />}
          />
        </div>

        {/* Mobile mode switch (Figma footer) — branco */}
        <div className="mt-auto pt-10 text-center md:hidden">
          {isLogin ? (
            <button
              type="button"
              className="text-sm text-white"
              onClick={() => openAuth('register', state.redirectTo)}
            >
              Novo na Kurio? Crie uma conta
            </button>
          ) : (
            <button
              type="button"
              className="text-sm text-white"
              onClick={() => openAuth('login', state.redirectTo)}
            >
              Já tem uma conta? Entre
            </button>
          )}
        </div>
      </Dialog.Content>
    </div>
    </Dialog.Portal>
    </Dialog.Root>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  type?: string
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder ?? label}
        value={value}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputClass}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
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
  placeholder,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  error?: string
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder ?? label}
          value={value}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(inputClass, 'pr-11')}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="absolute top-1/2 right-3 -translate-y-1/2 text-[#b39463] hover:text-[#d1894d]"
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
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function SocialButton({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-[6px] border border-[#3d2e24] text-[13px] font-medium text-white transition hover:border-[#b39463]/50 hover:bg-white/[0.02]"
    >
      {icon}
      {label}
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.2 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.2 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 37 44 32 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.54-4.7 1.32 0 2.7.24 2.7.24v2.98h-1.52c-1.5 0-1.97.93-1.97 1.89v2.26h3.35l-.54 3.49h-2.81V24C19.61 23.09 24 18.1 24 12.07z"
      />
    </svg>
  )
}
