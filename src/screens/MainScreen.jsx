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
import { gameWebSocket } from '../services/gameWebSocket'
import '../utils/modals'

export default function MainScreen({ onNavigate }) {
  const [currentBet, setCurrentBet] = useState(1000)
  const [gameStarted, setGameStarted] = useState(false)
  const [showRulesModal, setShowRulesModal] = useState(false)
  const [showKeyboardModal, setShowKeyboardModal] = useState(false)
  const [countdownActive, setCountdownActive] = useState(false)
  const [countdownProgress, setCountdownProgress] = useState(0)
  const [countdownRemaining, setCountdownRemaining] = useState(null)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [registeredUsers, setRegisteredUsers] = useState(0)
  const [totalTickets, setTotalTickets] = useState(0)
  const [currentRoom, setCurrentRoom] = useState({ number: 1, users: 0 })
  const [rooms] = useState([
    { number: 1, users: 0 },
    { number: 2, users: 0 },
    { number: 3, users: 0 }
  ])
  const [userBets, setUserBets] = useState([])
  const [roomPhase, setRoomPhase] = useState('WAITING')
  const [winner, setWinner] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const lineContainerRef = useRef(null)
  const countdownIntervalRef = useRef(null)
  const minBet = 1000
  const maxBet = 1000000

  // Generate tape with avatars based on participants
  const generateTapeHTML = (participants, stopIndex) => {
    if (!participants || participants.length === 0) {
      return ''
    }

    const totalTickets = participants.reduce((sum, p) => sum + p.tickets, 0)
    if (totalTickets === 0) return ''

    const totalItems = 200 // Total items in the tape
    const items = []
    
    // Calculate cumulative positions for each participant
    let cumulative = 0
    const participantRanges = participants.map(p => {
      const start = cumulative
      cumulative += p.tickets
      const end = cumulative
      return { ...p, start, end }
    })

    // Generate tape items
    for (let i = 0; i < totalItems; i++) {
      // Map position to ticket range
      const position = (i / totalItems) * totalTickets
      
      // Find which participant this position belongs to
      const participant = participantRanges.find(p => position >= p.start && position < p.end)
      
      // Use participant's userId to determine avatar (for now, just use userId % 3)
      const avatarIndex = participant ? (participant.userId % 3) : 0
      const avatars = [avatar1, avatar2, avatar3]
      const avatarUrl = avatars[avatarIndex]
      
      // Mark stop position
      const isStopPosition = stopIndex !== null && Math.abs(position - stopIndex) < (totalTickets / totalItems)
      const isMiddle = i === Math.floor(totalItems / 2)
      
      items.push(
        `<div class='spin__game-item spin__game-item--avatar' ${isMiddle ? "id='middleQ'" : ''} ${isStopPosition ? "data-stop='true'" : ''}>
          <img src="${avatarUrl}" alt="avatar" width="56" height="56" />
          <span style="position: absolute; color: white; font-size: 10px;">${participant ? participant.userId : ''}</span>
        </div>`
      )
    }
    
    return items.join('')
  }

  // WebSocket connection and state updates
  useEffect(() => {
    const roomNumber = currentRoom.number

    // Connect to WebSocket
    gameWebSocket.connect(
      roomNumber,
      (state) => {
        // Update state from server
        setRegisteredUsers(state.registeredPlayers || 0)
        setTotalTickets(state.totalTickets || 0)
        setRoomPhase(state.phase || 'WAITING')
        
        // Update participants
        if (state.participants) {
          setUserBets(state.participants.map(p => ({
            id: p.userId,
            avatar: defaultAvatar, // Placeholder
            name: `User ${p.userId}`,
            tickets: p.tickets
          })))
        }

        // Handle countdown
        if (state.phase === 'COUNTDOWN' && state.countdownRemainingSeconds !== null) {
          setCountdownActive(true)
          setCountdownRemaining(state.countdownRemainingSeconds)
        } else {
          setCountdownActive(false)
          setCountdownRemaining(null)
        }

        // Handle spin
        if (state.phase === 'SPINNING') {
          setGameStarted(true)
          // Generate tape with stop index
          if (lineContainerRef.current && state.participants && state.stopIndex !== null) {
            lineContainerRef.current.innerHTML = generateTapeHTML(state.participants, state.stopIndex)
            startSpinAnimation(state.stopIndex, state.spinDuration || 5000)
          }
        }

        // Handle winner
        if (state.phase === 'RESOLUTION' && state.winner) {
          setWinner(state.winner)
          setGameStarted(false)
        } else {
          setWinner(null)
        }
      },
      (error) => {
        setErrorMessage(error || 'WebSocket connection error')
        setShowErrorModal(true)
        setWsConnected(false)
      },
      (connected) => {
        // Connection state callback
        setWsConnected(connected)
        console.log('[MainScreen] WebSocket connection state:', connected)
      }
    )

    // Cleanup on unmount
    return () => {
      gameWebSocket.disconnect()
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [currentRoom.number])

  // Countdown timer
  useEffect(() => {
    if (countdownRemaining === null) {
      setCountdownProgress(0)
      return
    }

    const totalSeconds = 30
    const updateInterval = 100 // Update every 100ms

    countdownIntervalRef.current = setInterval(() => {
      setCountdownRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(countdownIntervalRef.current)
          return 0
        }
        const newRemaining = prev - 0.1
        setCountdownProgress(((totalSeconds - newRemaining) / totalSeconds) * 100)
        return newRemaining
      })
    }, updateInterval)

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [countdownRemaining])

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

  const startSpinAnimation = (stopIndex, duration) => {
    if (typeof window.$ === 'undefined') {
      console.error('jQuery not loaded')
      return
    }

    const $lineContainer = window.$('#lineContainer')
    if ($lineContainer.length) {
      $lineContainer.scrollLeft(0)
    }

    // Calculate scroll position based on stop index
    // This is a simplified calculation - you may need to adjust based on your tape structure
    const totalTickets = userBets.reduce((sum, bet) => sum + bet.tickets, 0)
    if (totalTickets === 0) return

    const scrollPosition = (stopIndex / totalTickets) * ($lineContainer[0]?.scrollWidth || 0)

    // Animate to stop position
    const $container = window.$('.noScrolQ')
    if ($container.length) {
      $container.animate({ scrollLeft: scrollPosition }, duration || 5000, 'swing', () => {
        // Add blink animation when animation completes
        const $stopElement = window.$('[data-stop="true"]')
        if ($stopElement.length) {
          $stopElement.addClass('blinkWinX')
        }
      })
    }
  }

  const handleJoin = () => {
    if (gameStarted || countdownActive || roomPhase === 'SPINNING' || roomPhase === 'RESOLUTION') {
      return
    }

    if (currentBet < minBet || currentBet > maxBet) {
      setErrorMessage(`Bet must be between ${minBet} and ${maxBet}`)
      setShowErrorModal(true)
      return
    }

    try {
      gameWebSocket.joinRound(currentRoom.number, currentBet)
      setGameStarted(true)
    } catch (error) {
      setErrorMessage(error.message || 'Failed to join round')
      setShowErrorModal(true)
    }
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
    // Disconnect from current room
    gameWebSocket.disconnect()
    setCurrentRoom(room)
    // WebSocket will reconnect in useEffect
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
                    disabled={!wsConnected || gameStarted || countdownActive || roomPhase === 'SPINNING' || roomPhase === 'RESOLUTION'}
                  >
                    <span className="education__button-text" id="textButton">
                      {!wsConnected ? 'Connecting...' : 
                       countdownActive ? `Joining... ${Math.ceil(countdownRemaining || 0)}s` : 
                       gameStarted || roomPhase === 'SPINNING' ? 'Spinning...' : 
                       roomPhase === 'RESOLUTION' ? 'Round Ended' : 'JOIN'}
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
