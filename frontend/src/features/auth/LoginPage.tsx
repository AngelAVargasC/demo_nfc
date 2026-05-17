import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import api from '@/shared/services/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import './LoginPage.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAccessToken, setUser } = useAuthStore()
  const navigate = useNavigate()

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
    <div className="login_page">
      <div className="login_visual">
        <div className="login_visual_overlay" />
        <div className="login_visual_fade" />
      </div>

      <div className="login_panel">
        <div className="login_logo">
          <img
            className="login_logo_img"
            src="/images/masonlogo-Photoroom.png"
            alt="Logo Gran Logia"
          />
        </div>

        <div className="login_brand">
          <h1 className="login_brand_title">SIGAM</h1>
          <p className="login_brand_subtitle">Sistema Integral de Gestión Masónica</p>
        </div>

        <div className="login_form_wrap">
          <div className="login_form_spacer" />

          <form onSubmit={handleLogin}>
            <div className="login_form_header">
              <h2 className="login_title">Sign in</h2>
              <p className="login_subtitle">Use your institutional account credentials.</p>
            </div>

            <div className="login_field">
              <label className="login_label">Correo electrónico</label>
              <input
                className="login_input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login_field_password">
              <label className="login_label">Contraseña</label>
              <input
                className="login_input login_input_password"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="login_toggle_pwd"
                onClick={() => setShowPwd(!showPwd)}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button type="submit" className="login_submit" disabled={loading}>
              {loading ? 'Verificando...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
