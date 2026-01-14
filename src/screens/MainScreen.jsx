import { useState, useEffect, useRef } from 'react'
import infoIcon from '../assets/images/tasks/info.png'
import historyIcon from '../assets/images/tasks/history.png'
import arrowDownIcon from '../assets/images/tasks/arrow-down.png'
import defaultAvatar from '../assets/images/default.png'
import avatar1 from '../assets/avatars/avatar1.svg'
import avatar2 from '../assets/avatars/avatar2.svg'
import avatar3 from '../assets/avatars/avatar3.svg'
import RoomDropdown from '../components/RoomDropdown'
import GameHistoryModal from '../components/GameHistoryModal'
import CustomKeyboard from '../components/CustomKeyboard'
import '../utils/modals'
import './MainScreen.css'

export default function MainScreen() {
  const [currentBet, setCurrentBet] = useState(1000)
  const [gameStarted, setGameStarted] = useState(false)
  const [showRulesModal, setShowRulesModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showKeyboardModal, setShowKeyboardModal] = useState(false)
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
    changeBet(value)
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

  const handleJoin = () => {
    if (gameStarted) return
    if (typeof window.$ === 'undefined') {
      console.error('jQuery not loaded')
      return
    }

    setGameStarted(true)

    // TODO: Implement actual API call
    setTimeout(() => {
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
    }, 100)
  }

  const openModal = (modalName) => {
    if (modalName === 'rulesModal') {
      setShowRulesModal(true)
      if (typeof window.openModal === 'function') {
        window.openModal('rulesModal')
      }
    } else if (modalName === 'gameHistoryModal') {
      setShowHistoryModal(true)
      if (typeof window.openModal === 'function') {
        window.openModal('gameHistoryModal')
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
    } else if (modalName === 'gameHistoryModal') {
      setShowHistoryModal(false)
      if (typeof window.closeModal === 'function') {
        window.closeModal('gameHistoryModal')
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
              onClick={() => openModal('gameHistoryModal')}
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
              disabled={gameStarted}
            >
              <span className="education__button-text" id="textButton">
                {gameStarted ? 'Joining...' : 'JOIN'}
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

      {/* Game History Modal */}
      {showHistoryModal && (
        <GameHistoryModal onClose={() => {
          setShowHistoryModal(false)
          closeModal('gameHistoryModal')
        }} />
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
