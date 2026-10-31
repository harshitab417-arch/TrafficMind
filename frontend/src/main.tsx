import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

// Fix Leaflet marker icon path in bundled assets
L.Icon.Default.mergeOptions({
  iconUrl,
  shadowUrl,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
