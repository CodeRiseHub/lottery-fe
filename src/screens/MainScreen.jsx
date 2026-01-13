import { useState, useEffect, useRef } from 'react'
import infoIcon from '../assets/images/tasks/info.png'
import historyIcon from '../assets/images/tasks/history.png'
import arrowDownIcon from '../assets/images/tasks/arrow-down.png'
import defaultAvatar from '../assets/images/default.png'
import './MainScreen.css'

export default function MainScreen() {
  const [currentBet, setCurrentBet] = useState(1000)
  const [gameStarted, setGameStarted] = useState(false)
  const [showSpinModal, setShowSpinModal] = useState(false)
  const [showRealModal, setShowRealModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [userBets, setUserBets] = useState([
    { id: 1, avatar: 'https://t.me/i/userpic/320/ymBQlQnwMhxBHvDhcUEuudwlXbCg06cWpn4vOPBQt9Gig4YXvjD1s3hyOcqtH0Vq.svg', name: 'Lol 👑', win: 1611, factor: 'X1.5' },
    { id: 2, avatar: 'https://t.me/i/userpic/320/ymBQlQnwMhxBHvDhcUEuudwlXbCg06cWpn4vOPBQt9Gig4YXvjD1s3hyOcqtH0Vq.svg', name: 'Lol 👑', win: 1611, factor: 'X1.5' },
    { id: 3, avatar: 'https://t.me/i/userpic/320/ymBQlQnwMhxBHvDhcUEuudwlXbCg06cWpn4vOPBQt9Gig4YXvjD1s3hyOcqtH0Vq.svg', name: 'Lol 👑', win: 51573, factor: 'X3' },
    { id: 4, avatar: 'https://t.me/i/userpic/320/ymBQlQnwMhxBHvDhcUEuudwlXbCg06cWpn4vOPBQt9Gig4YXvjD1s3hyOcqtH0Vq.svg', name: 'Lol 👑', win: 0, factor: 'X0' },
  ])
  const [lineContainer, setLineContainer] = useState('')
  const lineContainerRef = useRef(null)
  const minBet = 100
  const maxBet = 1000000
  const realMod = 0 // Demo mode

  // Initial roulette items
  const initialRouletteItems = [
    'X3', 'X10', 'X10', 'X3', 'X10', 'X0', 'X10', 'X3', 'X3', 'X50',
    'X1.5', 'X0', 'X3', 'X3', 'X1.5', 'X0', 'X3', 'X0', 'X10', 'X3',
    'X3', 'X50', 'X3', 'X0', 'X1.5', 'X50', 'X1.5', 'X3', 'X1.5', 'X3',
    'X3', 'X1.5', 'X1.5', 'X0', 'X10', 'X10', 'X0', 'X3', 'X10', 'X3',
    'X0', 'X1.5', 'X100', 'X3', 'X0', 'X1.5', 'X0', 'X10', 'X50', 'X1.5',
    'X3', 'X1.5', 'X50', 'X1.5', 'X10', 'X3', 'X1.5', 'X1.5', 'X3', 'X3',
    'X1.5', 'X50', 'X3', 'X0', 'X1.5', 'X1.5', 'X10', 'X1.5', 'X3', 'X3',
    'X1.5', 'X1.5', 'X3', 'X1.5', 'X0', 'X1.5', 'X10', 'X10', 'X10', 'X10',
    'X50', 'X1.5', 'X50', 'X0', 'X10', 'X50', 'X3', 'X100', 'X0', 'X3',
    'X1.5', 'X1.5', 'X3', 'X1.5', 'X1.5', 'X3', 'X3', 'X1.5', 'X0', 'X3'
  ]

  useEffect(() => {
    // Initialize line container with initial items
    const items = initialRouletteItems.map((item, idx) => {
      let color = ''
      if (item === 'X10') color = 'yellow'
      else if (item === 'X50') color = '#336699'
      else if (item === 'X100') color = 'red'
      
      return `<div class='spin__game-item' ${idx === 82 ? "id='middleQ'" : ''} ${color ? `style='color:${color}'` : ''}>${item}</div>`
    }).join('')
    setLineContainer(items)
  }, [])

  const changeBet = (newBet) => {
    let bet = parseInt(newBet, 10)
    bet = bet <= minBet ? minBet : bet
    bet = bet >= maxBet ? maxBet : bet
    setCurrentBet(bet)
  }

  const handleBetChange = (action) => {
    if (action === 'min') changeBet(minBet)
    else if (action === 'half') changeBet(Math.floor(currentBet / 2))
    else if (action === 'double') changeBet(currentBet * 2)
    else if (action === 'max') {
      // TODO: Get actual balance from API
      const balance = 100000
      const max = balance - 1000 > maxBet ? maxBet : balance - 1000
      changeBet(max)
    }
  }

  const handleSpin = () => {
    if (gameStarted) return
    setGameStarted(true)

    // TODO: Implement actual API call
    // For now, simulate the game
    setTimeout(() => {
      // Simulate game result
      const result = initialRouletteItems[82] // Middle item
      const factor = parseFloat(result.replace('X', ''))
      const win = realMod ? Math.floor(currentBet * factor) : 0

      // Add new bet to list
      const newBet = {
        id: Date.now(),
        avatar: 'https://t.me/i/userpic/320/ymBQlQnwMhxBHvDhcUEuudwlXbCg06cWpn4vOPBQt9Gig4YXvjD1s3hyOcqtH0Vq.svg',
        name: 'You 👑',
        win: win,
        factor: result
      }
      setUserBets(prev => [newBet, ...prev.slice(0, 14)])

      // Scroll animation
      if (lineContainerRef.current) {
        const middleElement = lineContainerRef.current.querySelector('#middleQ')
        if (middleElement) {
          const container = lineContainerRef.current
          const offset = middleElement.offsetLeft - (container.clientWidth / 2) + (middleElement.clientWidth / 2)
          container.scrollTo({ left: offset, behavior: 'smooth' })
        }
      }

      setGameStarted(false)
    }, 3500)
  }

  const openModal = (modalName) => {
    if (modalName === 'spinModal') setShowSpinModal(true)
    else if (modalName === 'realModal') setShowRealModal(true)
    else if (modalName === 'errorModal') setShowErrorModal(true)
    document.body.style.overflow = 'hidden'
  }

  const closeModal = (modalName) => {
    if (modalName === 'spinModal') setShowSpinModal(false)
    else if (modalName === 'realModal') setShowRealModal(false)
    else if (modalName === 'errorModal') setShowErrorModal(false)
    document.body.style.overflow = 'auto'
  }

  const formatNumber = (number) => {
    return Math.floor(number).toLocaleString('ru-RU')
  }

  return (
    <>
      <section>
        <div className="container">
          <div className="spin__header">
            <button
              onClick={() => openModal('spinModal')}
              className="spin__button"
            >
              <img src={infoIcon} alt="info" width="34" />
            </button>
            <p className="title">Roulette</p>
            <a href="#history" className="spin__button">
              <img src={historyIcon} alt="info" width="42" />
            </a>
          </div>

          <div className="tabs" data-tabs>
            <ul className="tabs__nav tabs__nav-spin" data-tabs-nav>
              <li data-tab-target="demo" className="active">
                <span>Demo</span>
              </li>
              <li onClick={() => openModal('realModal')}>
                <span>Real</span>
              </li>
              <div className="tabs__active-border tabs__active-position-second tabs__active-position">
                <span className="tabs__active-bg tabs__active-position"></span>
              </div>
            </ul>

            <div className="tabs__content" data-tab-content="demo">
              <div className="tabs__content tabs__content--demo">
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
                    dangerouslySetInnerHTML={{ __html: lineContainer }}
                  />
                </div>

                <div className="spin__bets">
                  <p className="spin__bets-title">Choose your bet (Power):</p>
                  <input
                    type="text"
                    className="spin__input"
                    placeholder="1000"
                    id="amountBet"
                    value={currentBet}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || minBet
                      changeBet(val)
                    }}
                  />

                  <div className="spin__controls">
                    <button
                      className="spin__control-btn changeBetBT"
                      onClick={() => handleBetChange('min')}
                    >
                      <span>min</span>
                    </button>
                    <button
                      className="spin__control-btn changeBetBT"
                      onClick={() => handleBetChange('half')}
                    >
                      <span>1/2</span>
                    </button>
                    <button
                      className="spin__control-btn changeBetBT"
                      onClick={() => handleBetChange('double')}
                    >
                      <span>X2</span>
                    </button>
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
                    onClick={handleSpin}
                    disabled={gameStarted}
                  >
                    <span className="education__button-text" id="textButton">
                      {gameStarted ? 'Game started...' : 'SPIN'}
                    </span>
                  </button>
                </div>

                <p className="spin__subtitle">User's Bets</p>
                <div className="spin__bets-list">
                  {userBets.map((bet) => (
                    <div
                      key={bet.id}
                      className={`spin__bets-item ${bet.win > 0 ? 'spin__bets-item--success' : ''}`}
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
                          {bet.win > 0 ? '+' : ''}
                          {formatNumber(bet.win)} Power
                        </p>
                      </div>
                      <p className="spin__bets-sum">{bet.factor}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Spin Info Modal */}
      {showSpinModal && (
        <div
          className="layout active"
          data-modal="spinModal"
          onClick={(e) => {
            if (e.target.classList.contains('layout')) {
              closeModal('spinModal')
            }
          }}
        >
          <div className="modal modal__account-spin">
            <p className="modal__account-spin-title">Roulette Rules</p>
            <p className="modal__account-spin-text">
              <span>
                - Demo mode = no real money, just for fun. <br />
                - Real mode allows you to place bets with real money.
              </span>
              <span> Set your bet and tap "SPIN".</span>
              <span> Possible multipliers: x0, x1.5, x3, x10, x50, x100 </span>
            </p>
          </div>
        </div>
      )}

      {/* Real Modal */}
      {showRealModal && (
        <div
          className="layout active"
          data-modal="realModal"
          onClick={(e) => {
            if (e.target.classList.contains('layout')) {
              closeModal('realModal')
            }
          }}
        >
          <div className="modal modal__account-spin">
            <p className="modal__account-spin-title">Real mode is not yet unlocked</p>
            <p className="modal__account-spin-text">
              To access Real mode, a minimum deposit of $5 is required.
              <span>
                This measure protects the platform from misuse by dishonest users.
              </span>
            </p>
          </div>
        </div>
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

