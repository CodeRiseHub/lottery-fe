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
  
  // Load stored screen and props from localStorage on initialization
  const getStoredScreenState = () => {
    try {
      const storedScreen = localStorage.getItem('lottery_current_screen')
      const storedProps = localStorage.getItem('lottery_screen_props')
      
      let screen = 'main' // Default to main screen
      let props = {}
      
      // Load stored screen if valid
      if (storedScreen) {
        const validScreens = ['main', 'gameHistory', 'faq', 'support', 'supportChat', 'referral', 
                              'transactionHistory', 'store', 'tasks', 'payout', 
                              'starsPayoutConfirmation', 'giftPayoutConfirmation']
        if (validScreens.includes(storedScreen)) {
          screen = storedScreen
        }
      }
      
      // Load stored props if available
      if (storedProps) {
        try {
          props = JSON.parse(storedProps)
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
      
      // If no stored screen props but we have a stored room number, use it
      if (!props.roomNumber) {
        const storedRoom = localStorage.getItem('lottery_selected_room')
        if (storedRoom) {
          const roomNum = parseInt(storedRoom, 10)
          if (roomNum >= 1 && roomNum <= 3) {
            props.roomNumber = roomNum
          }
        }
      }
      
      return { screen, props }
    } catch (e) {
      // Ignore localStorage errors, return defaults
      return { screen: 'main', props: {} }
    }
  }
  
  const storedState = getStoredScreenState()
  const [currentScreen, setCurrentScreen] = useState(storedState.screen)
  const [screenProps, setScreenProps] = useState(storedState.props)
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
    
    // Store current screen and props in localStorage for persistence across page refreshes
    try {
      localStorage.setItem('lottery_current_screen', screen)
      localStorage.setItem('lottery_screen_props', JSON.stringify(props))
      
      // Also store room number separately if it's in props (for backward compatibility)
      if (props.roomNumber) {
        localStorage.setItem('lottery_selected_room', props.roomNumber.toString())
      }
    } catch (e) {
      // Ignore localStorage errors (e.g., in private browsing mode)
    }
  }

  const handleBack = (roomNumber) => {
    const props = roomNumber ? { roomNumber } : {}
    setCurrentScreen('main')
    setScreenProps(props)
    
    // Store current screen and props in localStorage
    try {
      localStorage.setItem('lottery_current_screen', 'main')
      localStorage.setItem('lottery_screen_props', JSON.stringify(props))
      
      // Also store room number separately if provided
      if (roomNumber) {
        localStorage.setItem('lottery_selected_room', roomNumber.toString())
      }
    } catch (e) {
      // Ignore localStorage errors
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

