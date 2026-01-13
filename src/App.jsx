import { useEffect, useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import MainScreen from './screens/MainScreen'
import './utils/modals'
import './App.css'

function App() {
  const [tg, setTg] = useState(null)
  const [currentScreen, setCurrentScreen] = useState('main')

  useEffect(() => {
    // Initialize Telegram WebApp
    if (window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp
      webApp.ready()
      
      const platform = webApp.platform
      if (platform === 'android' || platform === 'ios') {
        webApp.requestFullscreen()
        webApp.expand()
        if (webApp.isFullscreenAvailable) {
          webApp.requestFullscreen()
        }
      }
      
      setTg(webApp)
      
      // Handle safe area insets
      function updateSafeArea() {
        if (platform !== 'android' && platform !== 'ios') return
        
        const safeAreaInsetTop = 
          getComputedStyle(document.documentElement).getPropertyValue('--tg-safe-area-inset-top') || '0px'
        const safeAreaInsetTopValue = parseFloat(safeAreaInsetTop) || 0
        
        if (safeAreaInsetTopValue > 0) {
          const container = document.querySelector('.bg')
          const modal = document.querySelector('.modal--language-menu')
          if (container) container.style.marginTop = `${safeAreaInsetTopValue}px`
          if (modal) modal.style.top = `${safeAreaInsetTopValue}px`
        }
      }
      
      setTimeout(() => {
        updateSafeArea()
      }, 250)
      
      webApp.onEvent('viewportChanged', (event) => {
        if (event.isStateStable) {
          updateSafeArea()
        }
      })
    }
  }, [])

  const handleNavigate = (screen) => {
    setCurrentScreen(screen)
    // TODO: Implement navigation to other screens when they are added
    // For now, all navigation goes to main screen
    if (screen !== 'main') {
      console.log('Navigation to', screen, 'not yet implemented')
    }
  }

  return (
    <div className="bg">
      <Header />
      <main>
        {currentScreen === 'main' && <MainScreen />}
        {/* TODO: Add other screens here when implemented */}
      </main>
      <Footer currentScreen={currentScreen} onNavigate={handleNavigate} />
    </div>
  )
}

export default App

