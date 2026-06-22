import { useEffect, useState } from 'react'
import '../styles/admin-forms.css'
import { AdminField, AdminInput } from './AdminUI'
import { sendLoginCode } from '../lib/emailOtpAuth'

export function EmailOtpLogin({
  title,
  subtitle,
  codeSubtitle,
  checkEmail,
  onCodeSent,
  onVerify,
  pendingEmail,
  isPending,
  onCancel,
  onResend,
}) {
  const [email, setEmail] = useState(pendingEmail || '')
  const [code, setCode] = useState('')
  const [step, setStep] = useState(isPending ? 'code' : 'email')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isPending && pendingEmail) {
      setStep('code')
      setEmail(pendingEmail)
    }
  }, [isPending, pendingEmail])

  const handleEmailSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await checkEmail(email)
      await onCodeSent(email)
      setStep('code')
      setCode('')
    } catch (err) {
      setError(err?.message || 'No se pudo enviar el código.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await onVerify(email, code)
    } catch (err) {
      setError(err?.message || 'Código incorrecto o expirado.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setIsLoading(true)
    try {
      if (onResend) {
        await onResend(email)
      } else {
        await sendLoginCode(email)
      }
    } catch {
      setError('No se pudo reenviar el código.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    onCancel?.()
    setStep('email')
    setCode('')
    setError('')
  }

  return (
    <>
      <h1>{title}</h1>
      <p>{step === 'code' ? codeSubtitle || `Código enviado a ${email}` : subtitle}</p>

      {step === 'email' && (
        <form className="admin-login-form" onSubmit={handleEmailSubmit}>
          <AdminField label="Correo electrónico">
            <AdminInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              autoComplete="email"
              required
            />
          </AdminField>
          <button type="submit" className="admin-login-btn" disabled={isLoading}>
            {isLoading ? 'Enviando...' : 'Enviar código'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form className="admin-login-form" onSubmit={handleCodeSubmit}>
          <AdminField label="Código de verificación">
            <AdminInput
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
              placeholder="000000"
              autoComplete="one-time-code"
              required
            />
          </AdminField>
          <button type="submit" className="admin-login-btn" disabled={isLoading}>
            {isLoading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <div className="admin-login-2fa-actions">
          <button type="button" className="admin-login-back" onClick={handleResend} disabled={isLoading}>
            Reenviar código
          </button>
          <button type="button" className="admin-login-back" onClick={handleBack} disabled={isLoading}>
            Cambiar correo
          </button>
        </div>
      )}

      {error && <p className="admin-login-error">{error}</p>}
    </>
  )
}
