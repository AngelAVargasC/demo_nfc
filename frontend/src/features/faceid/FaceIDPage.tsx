import { useState } from 'react'
import { ScanLine, Maximize, KeyRound, Monitor } from 'lucide-react'
import FaceEnroll from './FaceEnroll'
import './FaceIDPage.css'

/* Lanzador del modo lector — abre la terminal de kiosco a pantalla completa. */
function ReaderLaunch() {
  return (
    <div className="faceid_launch">
      <div className="faceid_launch_card">
        <div className="faceid_launch_inner">
          <div className="faceid_launch_icon"><ScanLine size={24} /></div>
          <h3 className="faceid_launch_title">Lector de acceso · modo kiosco</h3>
          <p className="faceid_launch_desc">
            El lector facial funciona como terminal autónoma a pantalla completa,
            pensada para montarse en una tablet en la puerta del recinto. Se protege
            con un token de kiosco propio — no requiere iniciar sesión.
          </p>
          <ul className="faceid_launch_points">
            <li><Monitor size={15} /> Pantalla completa, sin barra lateral ni navegación.</li>
            <li><KeyRound size={15} /> Acceso protegido por token (X-Kiosk-Key).</li>
            <li><Maximize size={15} /> Reconocimiento continuo: concede o deniega el paso.</li>
          </ul>
          <button
            className="faceid_launch_btn"
            onClick={() => window.open('/lector', '_blank', 'noopener')}
          >
            <Maximize size={16} /> Abrir lector en pantalla completa
          </button>
          <p className="faceid_launch_note">
            También puedes abrir <code>/lector</code> directamente en el dispositivo
            y configurar el token la primera vez.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function FaceIDPage() {
  const [tab, setTab] = useState<'reader' | 'enroll'>('reader')

  return (
    <div className="faceid">
      <div className="faceid_tabs">
        <button
          className={`faceid_tab${tab === 'reader' ? ' faceid_tab_active' : ''}`}
          onClick={() => setTab('reader')}
        >
          Lector de acceso
        </button>
        <button
          className={`faceid_tab${tab === 'enroll' ? ' faceid_tab_active' : ''}`}
          onClick={() => setTab('enroll')}
        >
          Enrolar rostro
        </button>
      </div>

      {tab === 'reader' ? <ReaderLaunch /> : <FaceEnroll />}
    </div>
  )
}
