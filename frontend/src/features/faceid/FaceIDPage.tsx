import { useState } from 'react'
import FaceIdentify from './FaceIdentify'
import FaceEnroll from './FaceEnroll'
import './FaceIDPage.css'

export default function FaceIDPage() {
  const [tab, setTab] = useState<'access' | 'enroll'>('access')

  return (
    <div className="faceid">
      <div className="faceid_tabs">
        <button
          className={`faceid_tab${tab === 'access' ? ' faceid_tab_active' : ''}`}
          onClick={() => setTab('access')}
        >
          Acceso facial
        </button>
        <button
          className={`faceid_tab${tab === 'enroll' ? ' faceid_tab_active' : ''}`}
          onClick={() => setTab('enroll')}
        >
          Enrolar rostro
        </button>
      </div>

      {tab === 'access' ? <FaceIdentify /> : <FaceEnroll />}
    </div>
  )
}
