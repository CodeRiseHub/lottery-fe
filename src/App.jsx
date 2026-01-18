import { useEffect, useState, useCallback } from 'react'
import { bootstrapSession } from './auth/authService'
import { getSessionToken } from './auth/sessionManager'
import { fetchCurrentUser } from './api'
import { initRemoteLogger, setUserId } from './utils/remoteLogger'
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
  const [balance, setBalance] = useState('0.0000')
  const [authInitialized, setAuthInitialized] = useState(false)
  const [userData, setUserData] = useState(null)

  useEffect(() => {
    // Initialize remote logger early to capture all logs
    initRemoteLogger()
    
    // Initialize Telegram WebApp
    if (window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp
      webApp.ready()
      
      const platform = webApp.platform
      let sizebleS = false
      
      if (platform === 'android' || platform === 'ios') {
        sizebleS = true
        // Don't request fullscreen - let Telegram handle the viewport
        webApp.expand()
        // Removed fullscreen requests to allow normal Telegram mini app view
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
    // Always call /current first, then /session if 401, then /current again
    async function initializeAuth() {
      try {
        // Step 1: Always try to fetch current user first (regardless of token existence)
        console.debug("[App] Attempting to fetch current user...")
        try {
          const user = await fetchCurrentUser()
          // Success - user is authenticated
          setUserData(user)
          if (user?.id) {
            setUserId(user.id)
          }
          console.debug("[App] User authenticated successfully")
          setAuthInitialized(true)
          return
        } catch (error) {
          // Step 2: If /current returns 401, user is not authenticated
          // Check if it's a 401 error (authentication required)
          const is401 = error?.response?.status === 401 || 
                       error?.message?.includes('401') || 
                       error?.message?.includes('Authentication') ||
                       error?.message?.includes('Unauthorized')
          
          if (is401) {
            console.debug("[App] /current returned 401, bootstrapping new session...")
            // Clear any invalid token
            const { clearSessionToken } = await import('./auth/sessionManager')
            clearSessionToken()
            
            // Step 3: Bootstrap new session via /session
            const result = await bootstrapSession()
            if (result) {
              console.debug("[App] Session bootstrapped successfully")
              
              // Step 4: Call /current again after bootstrap
              try {
                const user = await fetchCurrentUser()
                setUserData(user)
                if (user?.id) {
                  setUserId(user.id)
                }
                console.debug("[App] User data fetched after bootstrap")
              } catch (fetchError) {
                console.error("[App] Failed to fetch user data after bootstrap:", fetchError)
                // Continue anyway - user might be in dev mode
              }
            } else {
              console.warn("[App] No session created (dev mode or no Telegram initData)")
            }
          } else {
            // Not a 401 error - some other error occurred
            console.error("[App] Failed to fetch current user (non-401 error):", error)
          }
        }
      } catch (error) {
        console.error("[App] Failed to initialize auth:", error)
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

  const handleBalanceUpdate = useCallback((formattedBalance) => {
    // formattedBalance is already a formatted string (e.g., "1.5627")
    console.log('[App] handleBalanceUpdate called with:', formattedBalance, 'current balance state:', balance)
    setBalance(formattedBalance)
  }, [])

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
        {currentScreen === 'main' && <MainScreen onNavigate={handleNavigate} onBalanceUpdate={handleBalanceUpdate} userData={userData} />}
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

