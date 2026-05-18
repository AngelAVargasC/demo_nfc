import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, ScanFace, Fingerprint } from 'lucide-react'
import api from '@/shared/services/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import './LoginPage.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [remember, setRemember] = useState(true)
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

  const handleBiometric = () => {
    toast('El acceso biométrico se gestiona desde la Secretaría de Seguridad.', {
      icon: '🔒',
    })
  }

  return (
    <div className="login_page">
      {/* ===================== Panel visual (izquierda) ===================== */}
      <aside className="login_visual">
        <div className="login_visual_overlay" />

        <span className="login_corner login_corner_tl" />
        <span className="login_corner login_corner_tr" />
        <span className="login_corner login_corner_bl" />
        <span className="login_corner login_corner_br" />

        <div className="login_visual_inner">
          <div className="login_org">
            <div className="login_org_mark">
              <img
                className="login_org_logo"
                src="/images/masonlogo-Photoroom.png"
                alt="Muy Respetable Gran Logia Valle de México"
              />
            </div>
          </div>

          <div className="login_hero">
            <span className="login_eyebrow">
              <span className="login_eyebrow_dot">◆</span> Acceso restringido · 2026
            </span>

            <h1 className="login_headline">
              Control de acceso
              <span className="login_headline_dim"> biométrico institucional.</span>
            </h1>

            <p className="login_lead">
              Plataforma unificada para la administración de accesos, enrolamiento
              facial y monitoreo en tiempo real de cada cuarto y puerta del recinto.
            </p>

            <div className="login_stats">
              <div className="login_stat">
                <span className="login_stat_value">1,247</span>
                <span className="login_stat_label">Hermanos enrolados</span>
              </div>
              <div className="login_stat">
                <span className="login_stat_value">24</span>
                <span className="login_stat_label">Dispositivos activos</span>
              </div>
              <div className="login_stat">
                <span className="login_stat_value">99.98%</span>
                <span className="login_stat_label">Uptime de red</span>
              </div>
            </div>
          </div>

          <div className="login_visual_foot">
            <span>GLVM/SEC-2026.04</span>
            <span>v3.2.1 · build 2841</span>
          </div>
        </div>
      </aside>

      {/* ===================== Panel del formulario (derecha) =============== */}
      <main className="login_form_side">
        <div className="login_form_wrap">
          <div className="login_form_meta">
            <span className="login_meta_label">Iniciar sesión</span>
            <span className="login_meta_secure">
              <span className="login_meta_dot" /> Cifrado TLS 1.3
            </span>
          </div>

          <div className="login_form_header">
            <h2 className="login_title">Autenticación</h2>
            <p className="login_subtitle">
              Solo personal autorizado. Esta sesión queda registrada en bitácora.
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="login_field">
              <label className="login_label">Correo institucional</label>
              <input
                className="login_input"
                type="email"
                placeholder="usuario@glvm.mx"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login_field login_field_password">
              <div className="login_label_row">
                <label className="login_label">Contraseña</label>
                <button
                  type="button"
                  className="login_forgot"
                  onClick={() =>
                    toast('Contacta a la Secretaría para restablecer tu contraseña.', {
                      icon: '✉️',
                    })
                  }
                >
                  Olvidé mi contraseña
                </button>
              </div>
              <input
                className="login_input login_input_password"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="login_toggle_pwd"
                onClick={() => setShowPwd(!showPwd)}
                aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <label className="login_remember">
              <input
                type="checkbox"
                className="login_remember_box"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
              />
              <span className="login_remember_text">
                Recordar este dispositivo durante 7 días
              </span>
            </label>

            <button type="submit" className="login_submit" disabled={loading}>
              {loading ? 'Verificando…' : 'Continuar'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="login_divider">
            <span className="login_divider_text">O con biometría</span>
          </div>

          <div className="login_biometric">
            <button
              type="button"
              className="login_bio_btn"
              onClick={handleBiometric}
            >
              <ScanFace size={17} />
              Face ID
            </button>
            <button
              type="button"
              className="login_bio_btn"
              onClick={handleBiometric}
            >
              <Fingerprint size={17} />
              Huella
            </button>
          </div>

          <p className="login_help">
            ¿Eres hermano nuevo? El enrolamiento facial se realiza presencialmente
            en la <strong>Secretaría de Seguridad</strong>.
          </p>
        </div>
      </main>
    </div>
  )
}
