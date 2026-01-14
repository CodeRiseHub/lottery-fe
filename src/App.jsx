import { useEffect, useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import MainScreen from './screens/MainScreen'
import GameHistoryScreen from './screens/GameHistoryScreen'
import FAQScreen from './screens/FAQScreen'
import SupportScreen from './screens/SupportScreen'
import ReferralScreen from './screens/ReferralScreen'
import TransactionHistoryScreen from './screens/TransactionHistoryScreen'
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
  }

  const handleBack = () => {
    setCurrentScreen('main')
  }

  return (
    <div className="bg">
      <Header onNavigate={handleNavigate} />
      <main>
        {currentScreen === 'main' && <MainScreen onNavigate={handleNavigate} />}
        {currentScreen === 'gameHistory' && <GameHistoryScreen onBack={handleBack} />}
        {currentScreen === 'faq' && <FAQScreen onBack={handleNavigate} />}
        {currentScreen === 'support' && <SupportScreen onBack={handleBack} />}
        {currentScreen === 'referral' && <ReferralScreen onBack={handleBack} />}
        {currentScreen === 'transactionHistory' && <TransactionHistoryScreen onBack={handleBack} />}
      </main>
      <Footer currentScreen={currentScreen} onNavigate={handleNavigate} />
    </div>
  )
}

export default App

