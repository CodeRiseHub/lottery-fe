import { useEffect, useState, useCallback } from 'react'
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
import StarsPayoutConfirmationScreen from './screens/StarsPayoutConfirmationScreen'
import GiftPayoutConfirmationScreen from './screens/GiftPayoutConfirmationScreen'
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
        try {
          const user = await fetchCurrentUser()
          // Success - user is authenticated
          setUserData(user)
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
            // Clear any invalid token
            const { clearSessionToken } = await import('./auth/sessionManager')
            clearSessionToken()
            
            // Step 3: Bootstrap new session via /session
            const result = await bootstrapSession()
            if (result) {
              // Step 4: Call /current again after bootstrap
              try {
                const user = await fetchCurrentUser()
                setUserData(user)
              } catch (fetchError) {
                // Continue anyway - user might be in dev mode
              }
            }
          }
        }
      } catch (error) {
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

  const handleBack = (roomNumber) => {
    if (roomNumber) {
      setCurrentScreen('main')
      setScreenProps({ roomNumber })
    } else {
      setCurrentScreen('main')
      setScreenProps({})
    }
  }

  const handleBalanceUpdate = useCallback((formattedBalance) => {
    // formattedBalance is already a formatted string (e.g., "1.5627")
    setBalance(formattedBalance)
  }, [])

  // Scroll to top when screen changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [currentScreen])

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
        {currentScreen === 'main' && <MainScreen onNavigate={handleNavigate} onBalanceUpdate={handleBalanceUpdate} userData={userData} roomNumber={screenProps.roomNumber} />}
        {currentScreen === 'gameHistory' && <GameHistoryScreen onBack={handleBack} roomNumber={screenProps.roomNumber} />}
        {currentScreen === 'faq' && <FAQScreen onBack={handleNavigate} />}
        {currentScreen === 'support' && <SupportScreen onBack={handleBack} onNavigate={handleNavigate} />}
        {currentScreen === 'supportChat' && (
          <SupportChatScreen
            ticketId={screenProps.ticketId}
            ticketSubject={screenProps.ticketSubject}
            onBack={() => handleNavigate('support')}
          />
        )}
        {currentScreen === 'referral' && <ReferralScreen onBack={handleBack} userData={userData} />}
        {currentScreen === 'transactionHistory' && <TransactionHistoryScreen onBack={handleBack} />}
        {currentScreen === 'store' && (
          <StoreScreen 
            onBack={handleBack} 
            onNavigate={handleNavigate} 
            onBalanceUpdate={handleBalanceUpdate}
            onUserDataUpdate={setUserData}
          />
        )}
        {currentScreen === 'tasks' && (
          <TasksScreen 
            onBack={handleBack} 
            onNavigate={handleNavigate}
            onBalanceUpdate={handleBalanceUpdate}
            onUserDataUpdate={setUserData}
          />
        )}
        {currentScreen === 'payout' && <PayoutScreen onBack={handleBack} onNavigate={handleNavigate} />}
        {currentScreen === 'starsPayoutConfirmation' && (
          <StarsPayoutConfirmationScreen
            onBack={() => handleNavigate('payout')}
            onBalanceUpdate={handleBalanceUpdate}
            onUserDataUpdate={setUserData}
          />
        )}
        {currentScreen === 'giftPayoutConfirmation' && (
          <GiftPayoutConfirmationScreen
            onBack={() => handleNavigate('payout')}
            onBalanceUpdate={handleBalanceUpdate}
            onUserDataUpdate={setUserData}
          />
        )}
      </main>
      <Footer currentScreen={currentScreen} onNavigate={handleNavigate} />
    </div>
  )
}

export default App

