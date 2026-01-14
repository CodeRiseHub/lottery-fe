import { useState, useEffect, useRef } from 'react'
import infoIcon from '../assets/images/tasks/info.png'
import historyIcon from '../assets/images/tasks/history.png'
import arrowDownIcon from '../assets/images/tasks/arrow-down.png'
import defaultAvatar from '../assets/images/default.png'
import avatar1 from '../assets/avatars/avatar1.svg'
import avatar2 from '../assets/avatars/avatar2.svg'
import avatar3 from '../assets/avatars/avatar3.svg'
import RoomDropdown from '../components/RoomDropdown'
import CustomKeyboard from '../components/CustomKeyboard'
import '../utils/modals'

export default function MainScreen({ onNavigate }) {
  const [currentBet, setCurrentBet] = useState(1000)
  const [gameStarted, setGameStarted] = useState(false)
  const [showRulesModal, setShowRulesModal] = useState(false)
  const [showKeyboardModal, setShowKeyboardModal] = useState(false)
  const [countdownActive, setCountdownActive] = useState(false)
  const [countdownProgress, setCountdownProgress] = useState(0)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [registeredUsers, setRegisteredUsers] = useState(42)
  const [totalTickets, setTotalTickets] = useState(125000)
  const [currentRoom, setCurrentRoom] = useState({ number: 1, users: 15 })
  const [rooms] = useState([
    { number: 1, users: 15 },
    { number: 2, users: 8 },
    { number: 3, users: 19 }
  ])
  const [userBets, setUserBets] = useState([
    { id: 1, avatar: 'https://t.me/i/userpic/320/ymBQlQnwMhxBHvDhcUEuudwlXbCg06cWpn4vOPBQt9Gig4YXvjD1s3hyOcqtH0Vq.svg', name: 'Lol 👑', tickets: 1611 },
    { id: 2, avatar: 'https://t.me/i/userpic/320/ymBQlQnwMhxBHvDhcUEuudwlXbCg06cWpn4vOPBQt9Gig4YXvjD1s3hyOcqtH0Vq.svg', name: 'Lol 👑', tickets: 1611 },
    { id: 3, avatar: 'https://t.me/i/userpic/320/ymBQlQnwMhxBHvDhcUEuudwlXbCg06cWpn4vOPBQt9Gig4YXvjD1s3hyOcqtH0Vq.svg', name: 'Lol 👑', tickets: 51573 },
    { id: 4, avatar: 'https://t.me/i/userpic/320/ymBQlQnwMhxBHvDhcUEuudwlXbCg06cWpn4vOPBQt9Gig4YXvjD1s3hyOcqtH0Vq.svg', name: 'Lol 👑', tickets: 0 },
  ])
  const lineContainerRef = useRef(null)
  const minBet = 100
  const maxBet = 1000000

  // Avatar distribution based on ticket percentages
  // For demo: 40% avatar1, 35% avatar2, 25% avatar3
  const avatars = [avatar1, avatar2, avatar3]
  const avatarDistribution = [0.4, 0.35, 0.25] // Percentages for each avatar

  // Generate tape with avatars
  const generateTapeHTML = () => {
    const totalItems = 100 // Total items in the tape
    const items = []
    
    for (let i = 0; i < totalItems; i++) {
      // Calculate which avatar to use based on distribution
      const rand = Math.random()
      let cumulative = 0
      let avatarIndex = 0
      
      for (let j = 0; j < avatarDistribution.length; j++) {
        cumulative += avatarDistribution[j]
        if (rand <= cumulative) {
          avatarIndex = j
          break
        }
      }
      
      const isMiddle = i === Math.floor(totalItems / 2)
      items.push(
        `<div class='spin__game-item spin__game-item--avatar' ${isMiddle ? "id='middleQ'" : ''}>
          <img src="${avatars[avatarIndex]}" alt="avatar" width="56" height="56" />
        </div>`
      )
    }
    
    return items.join('')
  }

  useEffect(() => {
    // Initialize line container with avatars
    if (lineContainerRef.current) {
      lineContainerRef.current.innerHTML = generateTapeHTML()
    }
  }, [])

  const changeBet = (newBet) => {
    let bet = parseInt(newBet, 10)
    bet = bet <= minBet ? minBet : bet
    bet = bet >= maxBet ? maxBet : bet
    setCurrentBet(bet)
  }

  const handleBetChange = (action) => {
    if (action === 'min') changeBet(minBet)
    else if (action === 'max') {
      // TODO: Get actual balance from API
      const balance = 100000
      const max = balance - 1000 > maxBet ? maxBet : balance - 1000
      changeBet(max)
    }
  }

  const handleInputClick = () => {
    setShowKeyboardModal(true)
    if (typeof window.openModal === 'function') {
      window.openModal('customKeyboard')
    }
  }

  const handleKeyboardConfirm = (value) => {
    if (value && !isNaN(value) && value > 0) {
      changeBet(value)
    }
    setShowKeyboardModal(false)
    if (typeof window.closeModal === 'function') {
      window.closeModal('customKeyboard')
    }
  }

  const handleKeyboardClose = () => {
    setShowKeyboardModal(false)
    if (typeof window.closeModal === 'function') {
      window.closeModal('customKeyboard')
    }
  }

  const scrollToCenter = ($container, $element) => {
    if (typeof window.$ === 'undefined') return
    
    const container = $container[0]
    const element = $element[0]
    if (!container || !element) return

    const offset = element.offsetLeft - (container.clientWidth / 2) + (element.clientWidth / 2)
    $container.animate({ scrollLeft: offset }, 3000, "swing")
  }

  const startSpin = () => {
    if (typeof window.$ === 'undefined') {
      console.error('jQuery not loaded')
      return
    }

    const $lineContainer = window.$('#lineContainer')
    if ($lineContainer.length) {
      $lineContainer.scrollLeft(0)
      // Regenerate tape with new distribution
      $lineContainer.html(generateTapeHTML())
    }

    // Animate to center using jQuery
    const $container = window.$('.noScrolQ')
    const $middleElement = window.$('#middleQ')
    if ($container.length && $middleElement.length) {
      scrollToCenter($container, $middleElement)
    }

    setTimeout(() => {
      // Add blink animation
      const $middle = window.$('#middleQ')
      if ($middle.length) {
        $middle.addClass('blinkWinX')
      }

      // Simulate adding user bet
      const newBet = {
        id: Date.now(),
        avatar: 'https://t.me/i/userpic/320/ymBQlQnwMhxBHvDhcUEuudwlXbCg06cWpn4vOPBQt9Gig4YXvjD1s3hyOcqtH0Vq.svg',
        name: 'You 👑',
        tickets: currentBet
      }
      setUserBets(prev => [newBet, ...prev.slice(0, 14)])
      setTotalTickets(prev => prev + currentBet)
      setRegisteredUsers(prev => prev + 1)

      setGameStarted(false)
    }, 3500)
  }

  useEffect(() => {
    if (!countdownActive) {
      setCountdownProgress(0)
      return
    }

    const duration = 5000 // 5 seconds
    const interval = 16 // ~60fps
    const increment = 100 / (duration / interval)
    
    const timer = setInterval(() => {
      setCountdownProgress(prev => {
        const newProgress = prev + increment
        if (newProgress >= 100) {
          clearInterval(timer)
          setCountdownActive(false)
          setCountdownProgress(0)
          // Start spin after countdown completes
          setTimeout(() => {
            startSpin()
          }, 50)
          return 100
        }
        return newProgress
      })
    }, interval)

    return () => clearInterval(timer)
  }, [countdownActive])

  const handleJoin = () => {
    if (gameStarted || countdownActive) return
    
    setGameStarted(true)
    setCountdownActive(true)
    setCountdownProgress(0)
  }

  const openModal = (modalName) => {
    if (modalName === 'rulesModal') {
      setShowRulesModal(true)
      if (typeof window.openModal === 'function') {
        window.openModal('rulesModal')
      }
    } else if (modalName === 'errorModal') {
      setShowErrorModal(true)
      if (typeof window.openModal === 'function') {
        window.openModal('errorModal')
      }
    } else if (typeof window.openModal === 'function') {
      window.openModal(modalName)
    }
    document.body.style.overflow = 'hidden'
  }

  const closeModal = (modalName) => {
    if (modalName === 'rulesModal') {
      setShowRulesModal(false)
      if (typeof window.closeModal === 'function') {
        window.closeModal('rulesModal')
      }
    } else if (modalName === 'errorModal') {
      setShowErrorModal(false)
      if (typeof window.closeModal === 'function') {
        window.closeModal('errorModal')
      }
    } else if (typeof window.closeModal === 'function') {
      window.closeModal(modalName)
    }
    document.body.style.overflow = 'auto'
  }

  const formatNumber = (number) => {
    return Math.floor(number).toLocaleString('ru-RU')
  }

  const handleRoomChange = (room) => {
    setCurrentRoom(room)
    // TODO: Load room data from API
  }

  return (
    <>
      <section>
        <div className="container">
          <div className="spin__header">
            <button
              onClick={() => openModal('rulesModal')}
              className="spin__button"
            >
              <img src={infoIcon} alt="info" width="34" />
            </button>
            <RoomDropdown
              currentRoom={currentRoom}
              rooms={rooms}
              onRoomChange={handleRoomChange}
            />
            <button
              onClick={() => onNavigate && onNavigate('gameHistory')}
              className="spin__button"
            >
              <img src={historyIcon} alt="history" width="42" />
            </button>
          </div>

          <div className="lottery-stats">
            <div className="lottery-stats__item">
              <span className="lottery-stats__label">Registered:</span>
              <span className="lottery-stats__value">{registeredUsers} 👤</span>
            </div>
            <div className="lottery-stats__item">
              <span className="lottery-stats__label">Total Tickets:</span>
              <span className="lottery-stats__value">{formatNumber(totalTickets)}</span>
            </div>
          </div>

          <div className="spin__game-container">
            <div className="spin__game-wrapper">
              {countdownActive && (
                <svg className="spin__progress-ring" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path
                    className="spin__progress-ring-bg"
                    d="M 20,0 L 80,0 A 20,20 0 0,1 100,20 L 100,80 A 20,20 0 0,1 80,100 L 20,100 A 20,20 0 0,1 0,80 L 0,20 A 20,20 0 0,1 20,0 Z"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="2"
                  />
                  <path
                    className="spin__progress-ring-fill"
                    d="M 50,0 L 80,0 A 20,20 0 0,1 100,20 L 100,80 A 20,20 0 0,1 80,100 L 20,100 A 20,20 0 0,1 0,80 L 0,20 A 20,20 0 0,1 20,0 L 50,0"
                    fill="none"
                    stroke="#6cc5a1"
                    strokeWidth="2"
                    strokeDasharray="360"
                    strokeDashoffset={`${360 * (countdownProgress / 100)}`}
                    strokeLinecap="round"
                    pathLength="360"
                  />
                </svg>
              )}
              <img
                className="spin__arrow"
                src={arrowDownIcon}
                alt="arrow"
                width="36"
              />
              <div
                className="spin__game scroll-block noScrolQ"
                id="lineContainer"
                ref={lineContainerRef}
              />
            </div>
          </div>

          <div className="spin__bets">
            <p className="spin__bets-title">Choose your bet:</p>
            
            <div className="spin__controls-row">
              <button
                className="spin__control-btn changeBetBT"
                onClick={() => handleBetChange('min')}
              >
                <span>min</span>
              </button>
              <input
                type="text"
                className="spin__input"
                placeholder="1000"
                id="amountBet"
                value={currentBet}
                readOnly
                onClick={handleInputClick}
              />
              <button
                className="spin__control-btn changeBetBT"
                onClick={() => handleBetChange('max')}
              >
                <span>max</span>
              </button>
            </div>

                  <button
                    className="education__button"
                    id="startGame"
                    onClick={handleJoin}
                    disabled={gameStarted || countdownActive}
                  >
                    <span className="education__button-text" id="textButton">
                      {countdownActive ? 'Joining...' : gameStarted ? 'Spinning...' : 'JOIN'}
                    </span>
                  </button>
          </div>

          <p className="spin__subtitle">User's Bets</p>
          <div className="spin__bets-list">
            {userBets.map((bet) => (
              <div
                key={bet.id}
                className={`spin__bets-item ${bet.tickets > 0 ? 'spin__bets-item--success' : ''}`}
              >
                <img
                  src={bet.avatar}
                  alt="user"
                  width="56"
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.src = defaultAvatar
                  }}
                />
                <div className="spin__bets-info">
                  <p className="spin__bets-name">{bet.name}</p>
                  <p className="spin__bets-amount">
                    {bet.tickets > 0 ? '+' : ''}
                    {formatNumber(bet.tickets)} Tickets
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rules Modal */}
      {showRulesModal && (
        <div
          className="layout active"
          data-modal="rulesModal"
          onClick={(e) => {
            if (e.target.classList.contains('layout')) {
              closeModal('rulesModal')
            }
          }}
        >
          <div className="modal modal__account-spin" onClick={(e) => e.stopPropagation()}>
            <p className="modal__account-spin-title">Roulette Rules</p>
            <p className="modal__account-spin-text">
              <span>
                - Demo mode = no real money, just for fun. <br />
                - Real mode allows you to place bets with real money.
              </span>
              <span> Set your bet and tap "JOIN".</span>
              <span> Possible multipliers: x0, x1.5, x3, x10, x50, x100 </span>
            </p>
          </div>
        </div>
      )}

      {/* Custom Keyboard Modal */}
      {showKeyboardModal && (
        <CustomKeyboard
          value={currentBet}
          onChange={setCurrentBet}
          onConfirm={handleKeyboardConfirm}
          onClose={handleKeyboardClose}
        />
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div
          className="layout active"
          data-modal="errorModal"
          onClick={(e) => {
            if (e.target.classList.contains('layout')) {
              closeModal('errorModal')
            }
          }}
        >
          <div className="modal modal__account-spin">
            <p className="modal__account-spin-title" style={{ color: 'red' }}>
              ERROR
            </p>
            <p className="modal__account-spin-text">{errorMessage}</p>
          </div>
        </div>
      )}
    </>
  )
}
