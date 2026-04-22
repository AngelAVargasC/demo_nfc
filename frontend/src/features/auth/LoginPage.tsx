import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import api from '@/shared/services/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { useTheme } from '@/shared/theme/theme'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@sigam.mx')
  const [password, setPassword] = useState('Admin1234!')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAccessToken, setUser } = useAuthStore()
  const navigate = useNavigate()
  const { colors } = useTheme()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      if (data.success) {
        setAccessToken(data.data.access_token)
        setUser(data.data.user)
        navigate('/dashboard')
      } else {
        toast.error(data.error || 'Credenciales inválidas')
      }
    } catch {
      toast.error('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: colors.appBg, display: 'flex',
    }}>
      <div style={{
        width: '60%', minHeight: '100vh', position: 'relative',
        backgroundImage: 'url("/images/masonsidelogin.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(110deg, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.12) 100%)',
        }} />
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 260,
          height: '100%',
          background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(11,15,20,0.08) 20%, ${colors.appBg} 100%)`,
          pointerEvents: 'none',
        }} />
      </div>

      <div style={{
        width: '40%', minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '38px 34px',
        background: colors.appBg,
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 24, left: 26, width: 170, height: 62, overflow: 'hidden' }}>
          <img
            src="/images/masonlogo-Photoroom.png"
            alt="Logo Gran Logia"
            style={{ width: 170, height: 104, objectFit: 'cover', transform: 'translateY(-22px)', display: 'block' }}
          />
        </div>
        <div style={{ position: 'absolute', top: 28, right: 32, textAlign: 'right' }}>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: colors.text, margin: 0, lineHeight: 1 }}>SIGAM</h1>
          <p style={{ fontSize: 12, color: colors.muted, marginTop: 6, marginBottom: 0 }}>Sistema Integral de Gestión Masónica</p>
        </div>

        <div style={{
          width: '100%', maxWidth: 470,
        }}>
          <div style={{ height: 34 }} />

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: 0, lineHeight: 1 }}>Sign in</h2>
              <p style={{ fontSize: 12, color: colors.muted, marginTop: 6, marginBottom: 0 }}>
                Use your institutional account credentials.
              </p>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, color: colors.text, marginBottom: 8, fontWeight: 600 }}>Correo electrónico</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{
                  width: '100%', height: 46, padding: '0 14px', background: colors.inputBg,
                  border: `1px solid ${colors.border}`, borderRadius: 10, color: colors.text,
                  fontSize: 15, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 22, position: 'relative' }}>
              <label style={{ display: 'block', fontSize: 13, color: colors.text, marginBottom: 8, fontWeight: 600 }}>Contraseña</label>
              <input
                type={showPwd ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} required
                style={{
                  width: '100%', height: 46, padding: '0 42px 0 14px', background: colors.inputBg,
                  border: `1px solid ${colors.border}`, borderRadius: 10, color: colors.text,
                  fontSize: 15, outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
                position: 'absolute', right: 12, top: 40, background: 'none',
                border: 'none', color: colors.muted, cursor: 'pointer', padding: 0,
              }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', height: 48, background: loading ? '#007a6866' : '#00a88e',
              border: 'none', borderRadius: 10, color: '#fff', fontSize: 19,
              fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 200ms',
            }}>
              {loading ? 'Verificando...' : 'Iniciar sesión'}
            </button>
          </form>

          <div style={{ marginTop: 18 }}>
            <p style={{ fontSize: 12, color: colors.text, marginBottom: 8, fontWeight: 700 }}>Credenciales demo:</p>
            {[
              ['admin@sigam.mx', 'Admin1234!'],
              ['lector@sigam.mx', 'Lec1234!'],
            ].map(([e, p]) => (
              <button key={e} onClick={() => { setEmail(e); setPassword(p) }}
                style={{ display: 'block', background: 'none', border: 'none', color: '#00a88e', cursor: 'pointer', fontSize: 13, padding: '3px 0', textAlign: 'left', fontWeight: 600 }}>
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
