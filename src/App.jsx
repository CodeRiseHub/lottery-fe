import { useEffect, useState } from 'react'
import { bootstrapSession } from './auth/authService'
import { getSessionToken } from './auth/sessionManager'
import { fetchCurrentUser } from './api'
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
  const [authInitialized, setAuthInitialized] = useState(false)
  const [userData, setUserData] = useState(null)

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

    // Initialize auth on app startup
    async function initializeAuth() {
      try {
        // Check if we have a stored session token
        const existingToken = getSessionToken()
        console.debug("[App] Token check:", {
          hasToken: !!existingToken,
          tokenLength: existingToken?.length,
          isTelegram: !!window.Telegram?.WebApp,
          hasCloudStorage: !!window.Telegram?.WebApp?.CloudStorage,
          cloudStorageType: typeof window.Telegram?.WebApp?.CloudStorage
        })
        
        if (existingToken) {
          // Validate the token by making a lightweight API call
          console.debug("[App] Existing session token found, validating...")
          try {
            const user = await fetchCurrentUser()
            // Token is valid, store user data and skip bootstrap
            setUserData(user)
            console.debug("[App] Session token validated successfully")
            setAuthInitialized(true)
            return
          } catch (error) {
            // Token is invalid or expired (401), clear it and bootstrap new one
            console.debug("[App] Session token validation failed (401), clearing and re-authenticating:", error)
            const { clearSessionToken } = await import('./auth/sessionManager')
            clearSessionToken()
            // Continue to bootstrap below
          }
        }

        // No token exists or token is invalid, bootstrap a new session
        console.debug("[App] No valid session token, bootstrapping...")
        const result = await bootstrapSession()
        if (result) {
          console.debug("[App] Session bootstrapped successfully")
        } else {
          console.warn("[App] No session created (dev mode or no Telegram initData)")
        }
      } catch (error) {
        console.error("[App] Failed to bootstrap session:", error)
        // Continue anyway - user might be in dev mode without Telegram
      } finally {
        setAuthInitialized(true)
      }
    }

    initializeAuth()
  }, [])

  const handleNavigate = (screen, props = {}) => {
    setCurrentScreen(screen)
    setScreenProps(props)
  }

  const handleBack = () => {
    setCurrentScreen('main')
    setScreenProps({})
  }

  const handleBalanceUpdate = (formattedBalance) => {
    // formattedBalance is already a formatted string (e.g., "1.5627")
    setBalance(formattedBalance)
  }

  if (!authInitialized) {
    return (
      <div className="bg">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}>
          <p>Initializing...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg">
      <Header onNavigate={handleNavigate} balance={balance} onBalanceUpdate={handleBalanceUpdate} userData={userData} />
      <main>
        {currentScreen === 'main' && <MainScreen onNavigate={handleNavigate} onBalanceUpdate={handleBalanceUpdate} />}
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

