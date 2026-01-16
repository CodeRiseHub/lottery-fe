import { useState, useEffect, useRef } from 'react'
import infoIcon from '../assets/images/tasks/info.png'
import historyIcon from '../assets/images/tasks/history.png'
import arrowDownIcon from '../assets/images/tasks/arrow-down.png'
import defaultAvatar from '../assets/images/default.png'
import RoomDropdown from '../components/RoomDropdown'
import CustomKeyboard from '../components/CustomKeyboard'
import { gameWebSocket } from '../services/gameWebSocket'
import { fetchCurrentUser } from '../api'
import { formatBalance } from '../utils/balanceFormatter'
import '../utils/modals'

export default function MainScreen({ onNavigate, onBalanceUpdate }) {
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
  const [rooms, setRooms] = useState([
    { number: 1, users: 0 },
    { number: 2, users: 0 },
    { number: 3, users: 0 }
  ])
  const [userBets, setUserBets] = useState([])
  const [roomPhase, setRoomPhase] = useState('WAITING')
  const [winner, setWinner] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [userBalance, setUserBalance] = useState(0) // Balance in bigint format
  const [userTickets, setUserTickets] = useState(0) // User's tickets in current round
  const [isJoining, setIsJoining] = useState(false) // Track if user is attempting to join
  const [currentUserId, setCurrentUserId] = useState(null) // Current user ID
  const lineContainerRef = useRef(null)
  const countdownIntervalRef = useRef(null)
  // Bet limits in ticket units (for UI display)
  const minBet = 1000
  const maxBet = 1000000

  // Generate tape with empty blocks (like lottery-draft-fe but without text/avatars)
  const generateTapeHTML = (participants, stopIndex) => {
    if (!participants || participants.length === 0) {
      return '' // Return empty - will show "Waiting for users..." message
    }

    const totalTickets = participants.reduce((sum, p) => sum + p.tickets, 0)
    if (totalTickets === 0) {
      return ''
    }

    const items = []
    
    // Calculate cumulative positions for each participant
    let cumulative = 0
    const participantRanges = participants.map(p => {
      const start = cumulative
      cumulative += p.tickets
      const end = cumulative
      return { ...p, start, end }
    })

    // Generate tape items - repeat participants proportionally
    // Use more items for smoother animation (like lottery-draft-fe)
    const totalItems = 200
    for (let i = 0; i < totalItems; i++) {
      // Map position to ticket range
      const position = (i / totalItems) * totalTickets
      
      // Find which participant this position belongs to
      const participant = participantRanges.find(p => position >= p.start && position < p.end)
      
      if (!participant) continue
      
      // Mark stop position and middle item
      const isStopPosition = stopIndex !== null && Math.abs(position - stopIndex) < (totalTickets / totalItems)
      const isMiddle = i === Math.floor(totalItems / 2)
      
      // Create empty block (no avatars, no text - just empty div)
      items.push(
        `<div class='spin__game-item' ${isMiddle ? "id='middleQ'" : ''} ${isStopPosition ? "data-stop='true'" : ''}></div>`
      )
    }
    
    return items.join('')
  }

  // Calculate user's win chance percentage
  const calculateWinChance = () => {
    // totalTickets and userTickets are already in ticket units (converted from bigint)
    if (totalTickets === 0 || userTickets === 0) return 0
    return ((userTickets / totalTickets) * 100).toFixed(2)
  }

  // Fetch user balance and ID on mount
  useEffect(() => {
    async function fetchUserData() {
      try {
        const user = await fetchCurrentUser()
        if (user) {
          if (user.id) {
            setCurrentUserId(user.id)
          }
          if (user.balanceA !== undefined) {
            setUserBalance(user.balanceA)
            if (onBalanceUpdate) {
              onBalanceUpdate(formatBalance(user.balanceA))
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
      }
    }
    fetchUserData()
  }, [onBalanceUpdate])

  // WebSocket connection and state updates
  useEffect(() => {
    const roomNumber = currentRoom.number

    // Connect to WebSocket
    gameWebSocket.connect(
      roomNumber,
      (state) => {
        // Update state from server
        setRegisteredUsers(state.registeredPlayers || 0)
        // totalTickets from backend is in bigint format, convert to ticket units for display
        const totalTicketsBigint = state.totalTickets || 0
        const totalTicketsDisplay = totalTicketsBigint / 1000000
        setTotalTickets(totalTicketsDisplay)
        setRoomPhase(state.phase || 'WAITING')
        
        // Update room user count for all rooms (always update, even if no participants)
        if (state.roomNumber !== undefined && state.roomNumber !== null) {
          const userCount = state.registeredPlayers || 0
          setRooms(prevRooms => 
            prevRooms.map(room => 
              room.number === state.roomNumber 
                ? { ...room, users: userCount }
                : room
            )
          )
          // Also update currentRoom if it matches
          if (currentRoom.number === state.roomNumber) {
            setCurrentRoom(prev => ({ ...prev, users: userCount }))
          }
        }
        
        // Update participants and calculate user's tickets
        if (state.participants && state.participants.length > 0) {
          setUserBets(state.participants.map(p => ({
            id: p.userId,
            avatar: defaultAvatar,
            name: `User ${p.userId}`,
            tickets: p.tickets
          })))
          
          // Find current user's tickets
          // Tickets from backend are in bigint format, convert to ticket units for display
          const currentUserTicketsBigint = currentUserId 
            ? state.participants.find(p => p.userId === currentUserId)?.tickets || 0
            : 0
          const currentUserTickets = currentUserTicketsBigint / 1000000
          setUserTickets(currentUserTickets)
          
          // Update tape with participants (generate tape for all phases except RESOLUTION)
          if (state.phase !== 'RESOLUTION' && lineContainerRef.current) {
            lineContainerRef.current.innerHTML = generateTapeHTML(state.participants, state.stopIndex)
          }
        } else {
          setUserBets([])
          setUserTickets(0)
          // Clear spinner when no participants
          if (lineContainerRef.current && state.phase !== 'RESOLUTION') {
            lineContainerRef.current.innerHTML = ''
          }
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
          // Only reset joining state if we're actually in the game (user has joined)
          // Check if current user is in participants
          const userHasJoined = currentUserId && state.participants && 
            state.participants.some(p => p.userId === currentUserId)
          if (userHasJoined) {
            setIsJoining(false) // Reset joining state only for users who joined
          }
          // Generate tape with stop index and start animation
          if (lineContainerRef.current && state.participants && state.stopIndex !== null) {
            lineContainerRef.current.innerHTML = generateTapeHTML(state.participants, state.stopIndex)
            // Start animation after a small delay to ensure DOM is ready
            setTimeout(() => {
              startSpinAnimation(state.stopIndex, state.spinDuration || 3000)
            }, 100)
          }
        } else if (state.phase === 'WAITING' || state.phase === 'COUNTDOWN') {
          // Reset game started state if we're back to waiting or countdown
          setGameStarted(false)
          // Only reset joining state if current user is NOT in participants
          // (meaning they haven't joined yet, so their joining state should be false)
          const userHasJoined = currentUserId && state.participants && 
            state.participants.some(p => p.userId === currentUserId)
          if (!userHasJoined && state.phase === 'WAITING') {
            setIsJoining(false) // Reset if user hasn't joined and we're in WAITING phase
          }
          // Don't reset if user is joining during COUNTDOWN - let them complete the join
        } else if (state.phase === 'RESOLUTION') {
          // Reset game started state when resolution phase starts
          setGameStarted(false)
          setIsJoining(false)
        }

        // Handle winner and update balance
        if (state.phase === 'RESOLUTION' && state.winner) {
          setWinner(state.winner)
          
          // Update balance if current user won
          if (state.winner.userId === currentUserId && state.winner.payout) {
            // Winner payout is already in bigint format (database format)
            const newBalance = userBalance + state.winner.payout
            setUserBalance(newBalance)
            if (onBalanceUpdate) {
              onBalanceUpdate(formatBalance(newBalance))
            }
            // Also fetch updated balance from server to ensure accuracy
            fetchCurrentUser().then(user => {
              if (user && user.balanceA !== undefined) {
                setUserBalance(user.balanceA)
                if (onBalanceUpdate) {
                  onBalanceUpdate(formatBalance(user.balanceA))
                }
              }
            }).catch(err => {
              console.error('Failed to refresh balance after win:', err)
            })
          }
          
          // Clear spinner to show winner
          if (lineContainerRef.current) {
            lineContainerRef.current.innerHTML = ''
          }
        } else {
          setWinner(null)
        }
      },
      (error) => {
        setErrorMessage(error || 'WebSocket connection error')
        setShowErrorModal(true)
        // Don't disconnect on join errors - only on connection errors
        if (error && error.includes('connection')) {
          setWsConnected(false)
        }
        // Reset game state on error
        setGameStarted(false)
        setIsJoining(false)
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
      // Use actual balance
      const balanceDisplay = formatBalance(userBalance)
      const balanceValue = parseFloat(balanceDisplay) * 1000000 // Convert to bigint equivalent
      const max = Math.min(balanceValue - 1000, maxBet)
      changeBet(Math.max(minBet, max))
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

    // Use scrollToCenter to center the middle item (like lottery-draft-fe)
    const $container = window.$('.noScrolQ')
    const $middleElement = window.$('#middleQ')
    
    if ($container.length && $middleElement.length) {
      scrollToCenter($container, $middleElement)
      
      // Add blink animation after animation completes (like lottery-draft-fe)
      setTimeout(() => {
        $middleElement.addClass('blinkWinX')
      }, duration || 3000)
    }
  }

  const handleJoin = () => {
    if (gameStarted || countdownActive || roomPhase === 'SPINNING' || roomPhase === 'RESOLUTION' || isJoining) {
      return
    }

    if (currentBet < minBet || currentBet > maxBet) {
      setErrorMessage(`Bet must be between ${minBet} and ${maxBet}`)
      setShowErrorModal(true)
      return
    }

    // Convert bet from ticket units to bigint format (database format)
    // Backend expects and works with bigint format throughout
    const betBigint = currentBet * 1000000
    
    // Check balance (balance is in bigint format with 6 decimal places)
    if (userBalance < betBigint) {
      setErrorMessage('Insufficient balance')
      setShowErrorModal(true)
      return
    }

    // Set joining state
    setIsJoining(true)

    try {
      // Send bet amount in bigint format (database format)
      gameWebSocket.joinRound(currentRoom.number, betBigint)
      
      // Update balance immediately (will be confirmed by server)
      const newBalance = userBalance - betBigint
      setUserBalance(newBalance)
      if (onBalanceUpdate) {
        onBalanceUpdate(formatBalance(newBalance))
      }
    } catch (error) {
      setIsJoining(false) // Reset on immediate error
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
            {currentUserId && userTickets > 0 && totalTickets > 0 && (
              <div className="lottery-stats__item">
                <span className="lottery-stats__label">Your Chance:</span>
                <span className="lottery-stats__value">{calculateWinChance()}%</span>
              </div>
            )}
            <div className="lottery-stats__item">
              <span className="lottery-stats__label">Total Tickets:</span>
              <span className="lottery-stats__value">{formatNumber(totalTickets)}</span>
            </div>
          </div>

          <div className="spin__game-container">
            <img
              className="spin__arrow"
              src={arrowDownIcon}
              alt="arrow"
              width="36"
            />
            {registeredUsers === 0 && roomPhase === 'WAITING' ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '110px',
                color: 'white',
                fontSize: '18px',
                textAlign: 'center',
                padding: '20px'
              }}>
                Waiting for users...
              </div>
            ) : winner ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '110px',
                color: 'white',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>
                  Winner: User {winner.userId}
                </div>
                <div style={{ fontSize: '16px', marginBottom: '5px' }}>
                  Bet: {formatBalance(winner.tickets)}
                </div>
                <div style={{ fontSize: '16px', marginBottom: '5px', color: '#6cc5a1' }}>
                  Win: {formatBalance(winner.payout)}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>
                  Chance: {totalTickets > 0 ? (((winner.tickets / 1000000) / totalTickets) * 100).toFixed(2) : 0}%
                </div>
              </div>
            ) : (
              <div
                className="spin__game scroll-block noScrolQ"
                id="lineContainer"
                ref={lineContainerRef}
              />
            )}
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
                    disabled={!wsConnected || gameStarted || countdownActive || roomPhase === 'SPINNING' || roomPhase === 'RESOLUTION' || isJoining}
                  >
                    <span className="education__button-text" id="textButton">
                      {!wsConnected ? 'Connecting...' : 
                       isJoining ? 'Joining...' :
                       countdownActive ? `Joining... ${Math.ceil(countdownRemaining || 0)}s` : 
                       roomPhase === 'SPINNING' ? 'Spinning...' : 
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
          <div className="modal modal__account-spin" onClick={(e) => e.stopPropagation()}>
            <p className="modal__account-spin-title" style={{ color: 'red' }}>
              Error
            </p>
            <p className="modal__account-spin-text">{errorMessage}</p>
            <button
              onClick={() => {
                closeModal('errorModal')
                // Reset joining state when modal is closed
                setIsJoining(false)
              }}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#6cc5a1',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  )
}
