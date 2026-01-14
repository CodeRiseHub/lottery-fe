import { useEffect, useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import MainScreen from './screens/MainScreen'
import GameHistoryScreen from './screens/GameHistoryScreen'
import FAQScreen from './screens/FAQScreen'
import SupportScreen from './screens/SupportScreen'
import SupportChatScreen from './screens/SupportChatScreen'
import ReferralScreen from './screens/ReferralScreen'
import TransactionHistoryScreen from './screens/TransactionHistoryScreen'
import StoreScreen from './screens/StoreScreen'
import TasksScreen from './screens/TasksScreen'
import PayoutScreen from './screens/PayoutScreen'
import PayoutConfirmationScreen from './screens/PayoutConfirmationScreen'
import './utils/modals'
import './App.css'

function App() {
  const [tg, setTg] = useState(null)
  const [currentScreen, setCurrentScreen] = useState('main') // 'main' is the Game screen
  const [screenProps, setScreenProps] = useState({})
  const [balance, setBalance] = useState('0.000000')

  useEffect(() => {
    // Initialize Telegram WebApp
    if (window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp
      webApp.ready()
      
      const platform = webApp.platform
      let sizebleS = false
      
      if (platform === 'android' || platform === 'ios') {
        sizebleS = true
        webApp.requestFullscreen()
        webApp.expand()
        if (webApp.isFullscreenAvailable) {
          webApp.requestFullscreen()
        }
      }
      
      setTg(webApp)
      
      // Handle safe area insets - matching Secret Miner implementation
      const modal = document.querySelector('.modal--language-menu')
      
      function updateSafeArea() {
        if (!sizebleS) return
        
        const safeAreaInsetTop = 
          getComputedStyle(document.documentElement).getPropertyValue('--tg-safe-area-inset-top') || '0px'
        const safeAreaInsetTopValue = parseFloat(safeAreaInsetTop) || 0
        
        if (safeAreaInsetTopValue > 0) {
          const nwidth = safeAreaInsetTopValue
          const container = document.querySelector('.bg')
          if (container) {
            container.style.marginTop = `${nwidth}px` // Только безопасный отступ
          }
          if (modal) {
            modal.style.top = `${nwidth}px` // Только безопасный отступ
          }
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

  const handleNavigate = (screen, props = {}) => {
    setCurrentScreen(screen)
    setScreenProps(props)
  }

  const handleBack = () => {
    setCurrentScreen('main')
    setScreenProps({})
  }

  const handleBalanceUpdate = (ticketsToAdd) => {
    const currentBalance = parseFloat(balance) || 0
    const newBalance = (currentBalance + ticketsToAdd).toFixed(6)
    setBalance(newBalance)
  }

  return (
    <div className="bg">
      <Header onNavigate={handleNavigate} balance={balance} onBalanceUpdate={handleBalanceUpdate} />
      <main>
        {currentScreen === 'main' && <MainScreen onNavigate={handleNavigate} />}
        {currentScreen === 'gameHistory' && <GameHistoryScreen onBack={handleBack} />}
        {currentScreen === 'faq' && <FAQScreen onBack={handleNavigate} />}
        {currentScreen === 'support' && <SupportScreen onBack={handleBack} onNavigate={handleNavigate} />}
        {currentScreen === 'supportChat' && (
          <SupportChatScreen
            ticketId={screenProps.ticketId}
            ticketSubject={screenProps.ticketSubject}
            onBack={() => handleNavigate('support')}
          />
        )}
        {currentScreen === 'referral' && <ReferralScreen onBack={handleBack} />}
        {currentScreen === 'transactionHistory' && <TransactionHistoryScreen onBack={handleBack} />}
        {currentScreen === 'store' && (
          <StoreScreen onBack={handleBack} onNavigate={handleNavigate} onBalanceUpdate={handleBalanceUpdate} />
        )}
        {currentScreen === 'tasks' && <TasksScreen onBack={handleBack} onNavigate={handleNavigate} />}
        {currentScreen === 'payout' && <PayoutScreen onBack={handleBack} onNavigate={handleNavigate} />}
        {currentScreen === 'payoutConfirmation' && (
          <PayoutConfirmationScreen
            onBack={() => handleNavigate('payout')}
          />
        )}
      </main>
      <Footer currentScreen={currentScreen} onNavigate={handleNavigate} />
    </div>
  )
}

export default App

