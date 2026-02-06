import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const wa = window.Telegram.WebApp;
const mobilePlatforms = ["ios", "android"];
const isMobile = mobilePlatforms.includes(wa.platform);
if (isMobile) {
  wa.requestFullscreen();
  wa.disableVerticalSwipes();
  wa.expand();
}


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div className={!isMobile ? "is_desktop" : "is_tma"}>
      <App />
    </div>
  </StrictMode>,
)




