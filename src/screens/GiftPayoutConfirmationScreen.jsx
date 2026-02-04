import { useState, useEffect, useRef } from 'react'
import { createPayout, fetchCurrentUser, fetchPayoutHistory } from '../api'
import { t, subscribeToLanguageChange } from '../i18n'
import backIcon from '../assets/images/back.png'

// Import all gift images
import heartImg from '../assets/purchase/gifts/heart.png'
import bearImg from '../assets/purchase/gifts/bear.png'
import giftboxImg from '../assets/purchase/gifts/giftbox.png'
import flowerImg from '../assets/purchase/gifts/flower.png'
import cakeImg from '../assets/purchase/gifts/cake.png'
import bouquetImg from '../assets/purchase/gifts/bouquet.png'
import rocketImg from '../assets/purchase/gifts/rocket.png'
import cupImg from '../assets/purchase/gifts/cup.png'
import ringImg from '../assets/purchase/gifts/ring.png'
import diamondImg from '../assets/purchase/gifts/diamond.png'
import champagneImg from '../assets/purchase/gifts/champagne.png'

// Gift names will be localized in the component using t() function
// All prices multiplied by 10 (e.g., 18 → 180)
const gifts = [
  { id: 'heart', nameKey: 'giftPayout.gift.heart', image: heartImg, price: 180 },
  { id: 'bear', nameKey: 'giftPayout.gift.bear', image: bearImg, price: 180 },
  { id: 'giftbox', nameKey: 'giftPayout.gift.giftbox', image: giftboxImg, price: 280 },
  { id: 'flower', nameKey: 'giftPayout.gift.flower', image: flowerImg, price: 280 },
  { id: 'cake', nameKey: 'giftPayout.gift.cake', image: cakeImg, price: 550 },
  { id: 'bouquet', nameKey: 'giftPayout.gift.bouquet', image: bouquetImg, price: 550 },
  { id: 'rocket', nameKey: 'giftPayout.gift.rocket', image: rocketImg, price: 550 },
  { id: 'champagne', nameKey: 'giftPayout.gift.champagne', image: champagneImg, price: 550 },
  { id: 'cup', nameKey: 'giftPayout.gift.cup', image: cupImg, price: 1100 },
  { id: 'ring', nameKey: 'giftPayout.gift.ring', image: ringImg, price: 1100 },
  { id: 'diamond', nameKey: 'giftPayout.gift.diamond', image: diamondImg, price: 1100 },
]

export default function GiftPayoutConfirmationScreen({ onBack, onBalanceUpdate, onUserDataUpdate }) {
  const [username, setUsername] = useState('')
  const [selectedGift, setSelectedGift] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [balanceTickets, setBalanceTickets] = useState('0')
  const [showGiftDropdown, setShowGiftDropdown] = useState(false)
  const [usernameError, setUsernameError] = useState('')
  const [giftError, setGiftError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [payoutHistory, setPayoutHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const usernameInputRef = useRef(null)

  // Reset form state when component mounts (fixes Telegram Desktop focus issue)
  useEffect(() => {
    setUsername('')
    setSelectedGift(null)
    setQuantity(1)
    setUsernameError('')
    setGiftError('')
    setSubmitError('')
    
    // Fix Telegram Desktop focus issue: ensure input is editable after navigation
    // This happens because Telegram Desktop may block input events after navigation
    const fixInputFocus = () => {
      if (usernameInputRef.current) {
        const input = usernameInputRef.current
        // Remove any attributes that might block input
        input.removeAttribute('readonly')
        input.removeAttribute('disabled')
        // Force a reflow to reset any internal state
        input.style.pointerEvents = 'auto'
        // Ensure the input can receive focus
        input.tabIndex = 0
      }
    }
    
    // Apply fix immediately and after a short delay
    fixInputFocus()
    const timer = setTimeout(fixInputFocus, 100)
    
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const footer = document.querySelector('.footer')
    if (!footer) return

    const handleTouchMove = (event) => {
      event.preventDefault()
    }

    const handleTouchStart = (event) => {
      event.stopPropagation()
    }

    footer.addEventListener('touchmove', handleTouchMove, { passive: false })
    footer.addEventListener('touchstart', handleTouchStart, { passive: false })

    return () => {
      footer.removeEventListener('touchmove', handleTouchMove)
      footer.removeEventListener('touchstart', handleTouchStart)
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.querySelector('[data-gift-dropdown]')
      const trigger = document.querySelector('[data-gift-trigger]')
      
      if (showGiftDropdown && 
          dropdown && 
          trigger &&
          !dropdown.contains(event.target) && 
          !trigger.contains(event.target)) {
        setShowGiftDropdown(false)
      }
    }

    if (showGiftDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showGiftDropdown])

  useEffect(() => {
    // Fetch payout history on component mount
    const loadHistory = async () => {
      try {
        setLoadingHistory(true)
        const history = await fetchPayoutHistory()
        setPayoutHistory(history || [])
      } catch (error) {
        console.error('Failed to load payout history:', error)
        setPayoutHistory([])
      } finally {
        setLoadingHistory(false)
      }
    }
    loadHistory()
  }, [])

  // Refetch payout history when language changes (to update localized statuses)
  useEffect(() => {
    const unsubscribe = subscribeToLanguageChange(() => {
      const loadHistory = async () => {
        try {
          setLoadingHistory(true)
          const history = await fetchPayoutHistory()
          setPayoutHistory(history || [])
        } catch (error) {
          console.error('Failed to load payout history:', error)
          setPayoutHistory([])
        } finally {
          setLoadingHistory(false)
        }
      }
      loadHistory()
    })

    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    // Update balance tickets when gift is selected or quantity changes
    if (selectedGift) {
      const totalPrice = selectedGift.price * quantity
      setBalanceTickets(totalPrice.toString())
      setGiftError('')
    } else {
      setBalanceTickets('0')
    }
  }, [selectedGift, quantity])
  
  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value) || 1
    if (value >= 1 && value <= 100) {
      setQuantity(value)
    } else if (value > 100) {
      setQuantity(100)
    } else if (value < 1) {
      setQuantity(1)
    }
  }
  
  const handleQuantityIncrement = () => {
    setQuantity(prev => Math.min(prev + 1, 100))
  }
  
  const handleQuantityDecrement = () => {
    setQuantity(prev => Math.max(prev - 1, 1))
  }

  const validateUsername = (value) => {
    // Username should start with @ followed by at least 1 English letter
    const usernamePattern = /^@[a-zA-Z]/
    if (value && !usernamePattern.test(value)) {
      setUsernameError(t('giftPayout.error.usernameInvalid'))
    } else {
      setUsernameError('')
    }
  }

  const handleUsernameChange = (e) => {
    const value = e.target.value
    setUsername(value)
    validateUsername(value)
  }

  const handleGiftSelect = (gift) => {
    setSelectedGift(gift)
    setShowGiftDropdown(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Reset errors
    setUsernameError('')
    setGiftError('')
    setSubmitError('')

    // Validate username
    validateUsername(username)
    
    // Validate gift selection
    if (!selectedGift) {
      setGiftError(t('giftPayout.error.giftRequired'))
      return
    }

    // Check if there are any errors
    const usernamePattern = /^@[a-zA-Z]/
    if (!username || !usernamePattern.test(username)) {
      setUsernameError(t('giftPayout.error.usernameInvalid'))
      return
    }

    setIsSubmitting(true)
    try {
      const tickets = parseFloat(balanceTickets) || 0
      // Convert gift id to uppercase for backend (e.g., 'heart' -> 'HEART')
      const giftName = selectedGift.id.toUpperCase()
      
      const response = await createPayout({
        username: username.trim(),
        total: tickets * 1_000_000, // Convert to bigint format
        starsAmount: null, // Will be calculated by backend based on gift type
        type: 'GIFT',
        giftName: giftName,
        quantity: quantity
      })

      // Fetch updated user data to get new balance
      const userData = await fetchCurrentUser()
      if (userData) {
        if (onUserDataUpdate) {
          onUserDataUpdate(userData)
        }
        if (onBalanceUpdate) {
          const balanceDisplay = (userData.balanceA / 1_000_000).toFixed(2)
          onBalanceUpdate(balanceDisplay)
        }
      }

      alert(t('giftPayout.success'))
      if (onBack) {
        onBack()
      }
    } catch (error) {
      const errorMessage = error.response?.message || error.message || 'Failed to submit payout request'
      setSubmitError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="payout">
      <div className="payout__container container">
        <h1 className="payout__title title">{t('giftPayout.title')}</h1>

        <form action="" method="POST" onSubmit={handleSubmit}>
          <div className="payout__form">
            <div className="payout__field">
              <p className="payout__label">{t('giftPayout.enterUsername')}</p>
              <input
                ref={usernameInputRef}
                type="text"
                className="payout__input"
                placeholder="@username"
                name="username"
                value={username}
                onChange={handleUsernameChange}
                onClick={(e) => {
                  // Force focus and ensure input is editable (fixes Telegram Desktop issue)
                  const input = e.target
                  input.focus()
                  input.removeAttribute('readonly')
                  input.removeAttribute('disabled')
                  input.style.pointerEvents = 'auto'
                }}
                onFocus={(e) => {
                  // Ensure input is editable on focus
                  const input = e.target
                  input.removeAttribute('readonly')
                  input.removeAttribute('disabled')
                  input.style.pointerEvents = 'auto'
                }}
                style={{ height: '42px', fontSize: '22px', textAlign: 'center' }}
              />
              {usernameError && (
                <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>{usernameError}</p>
              )}
            </div>

            <div className="payout__field" style={{ position: 'relative' }}>
              <p className="payout__label">{t('giftPayout.chooseGift')}</p>
              <div
                className="payout__input"
                data-gift-trigger
                onClick={(e) => {
                  e.stopPropagation()
                  setShowGiftDropdown(!showGiftDropdown)
                }}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: '40px',
                  padding: '10px'
                }}
              >
                {selectedGift ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={selectedGift.image} alt={t(selectedGift.nameKey)} width="30" height="30" />
                    <span>{t(selectedGift.nameKey)}</span>
                  </div>
                ) : (
                  <span style={{ color: '#999', width: '100%', textAlign: 'center' }}>{t('giftPayout.selectGift')}</span>
                )}
              </div>
              {giftError && (
                <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>{giftError}</p>
              )}
              
              {showGiftDropdown && (
                <div
                  data-gift-dropdown
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: '#2a3a4e',
                    border: '1px solid #3d4f65',
                    borderRadius: '8px',
                    padding: '10px',
                    zIndex: 1000,
                    marginTop: '5px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px'
                  }}
                >
                  {gifts.map((gift) => (
                    <div
                      key={gift.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleGiftSelect(gift)
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '10px',
                        cursor: 'pointer',
                        borderRadius: '5px',
                        border: selectedGift?.id === gift.id ? '2px solid #28a745' : '1px solid #3d4f65',
                        backgroundColor: selectedGift?.id === gift.id ? '#1e2a35' : 'transparent'
                      }}
                    >
                      <img src={gift.image} alt={t(gift.nameKey)} width="50" height="50" />
                      <span style={{ marginTop: '5px', fontSize: '12px', textAlign: 'center' }}>{t(gift.nameKey)}</span>
                      <span style={{ marginTop: '2px', fontSize: '10px', color: '#999' }}>{gift.price} {t('tasks.tickets')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="payout__field">
              <p className="payout__label">{t('giftPayout.selectNumber')}</p>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="number"
                  className="payout__input"
                  name="quantity"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={handleQuantityChange}
                  style={{ 
                    height: '42px',
                    width: '100%',
                    paddingRight: '40px',
                    textAlign: 'center',
                    fontSize: '22px',
                    WebkitAppearance: 'none',
                    MozAppearance: 'textfield',
                    appearance: 'none'
                  }}
                />
                <style>{`
                  input[type="number"]::-webkit-inner-spin-button,
                  input[type="number"]::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                  }
                  input[type="number"] {
                    -moz-appearance: textfield;
                  }
                `}</style>
                <div style={{
                  position: 'absolute',
                  right: '9px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  pointerEvents: 'none'
                }}>
                  <button
                    type="button"
                    onClick={handleQuantityIncrement}
                    disabled={quantity >= 100}
                    style={{
                      width: '20px',
                      height: '15px',
                      border: 'none',
                      background: 'transparent',
                      cursor: quantity >= 100 ? 'not-allowed' : 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'auto'
                    }}
                  >
                    <span style={{
                      fontSize: '10px',
                      color: quantity >= 100 ? '#666' : '#ccc',
                      lineHeight: 1
                    }}>▲</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleQuantityDecrement}
                    disabled={quantity <= 1}
                    style={{
                      width: '20px',
                      height: '15px',
                      border: 'none',
                      background: 'transparent',
                      cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'auto'
                    }}
                  >
                    <span style={{
                      fontSize: '10px',
                      color: quantity <= 1 ? '#666' : '#ccc',
                      lineHeight: 1
                    }}>▼</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="payout__field payout__field--result">
              <p className="payout__label">{t('giftPayout.yourBalance')}</p>
              <input
                type="text"
                className="payout__input"
                value={balanceTickets}
                disabled
                readOnly
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>

            {submitError && (
              <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '10px', textAlign: 'center' }}>
                {submitError}
              </p>
            )}
            <button 
              type="submit" 
              className="payout__button"
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? t('giftPayout.submitting') : t('giftPayout.confirm')}</span>
            </button>
          </div>
        </form>

        {/* Withdrawal History Table */}
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ 
            color: '#fff', 
            fontSize: '18px', 
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            {t('giftPayout.history.title')}
          </h2>
          <div style={{
            backgroundColor: '#2a3a4e',
            borderRadius: '8px',
            padding: '15px',
            overflowX: 'auto'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ 
                    color: '#fff', 
                    textAlign: 'left', 
                    padding: '10px',
                    borderBottom: '1px solid #3d4f65',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>{t('giftPayout.history.amount')}</th>
                  <th style={{ 
                    color: '#fff', 
                    textAlign: 'center', 
                    padding: '10px',
                    borderBottom: '1px solid #3d4f65',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>{t('giftPayout.history.date')}</th>
                  <th style={{ 
                    color: '#fff', 
                    textAlign: 'center', 
                    padding: '10px',
                    borderBottom: '1px solid #3d4f65',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>{t('giftPayout.history.status')}</th>
                </tr>
              </thead>
              <tbody>
                {loadingHistory ? (
                  <tr>
                    <td colSpan="3" style={{ 
                      color: '#999', 
                      textAlign: 'center', 
                      padding: '20px',
                      fontSize: '14px'
                    }}>
                      {t('giftPayout.history.loading')}
                    </td>
                  </tr>
                ) : payoutHistory.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ 
                      color: '#999', 
                      textAlign: 'center', 
                      padding: '20px',
                      fontSize: '14px'
                    }}>
                      {t('giftPayout.history.noData')}
                    </td>
                  </tr>
                ) : (
                  payoutHistory.map((entry, index) => {
                    // Convert bigint to tickets (divide by 1,000,000) and format as integer
                    const amountInTickets = Math.floor(entry.amount / 1_000_000)
                    
                    return (
                      <tr key={index} style={{ borderBottom: index < payoutHistory.length - 1 ? '1px solid #3d4f65' : 'none' }}>
                        <td style={{ 
                          color: '#fff', 
                          padding: '10px',
                          fontSize: '14px'
                        }}>
                          {amountInTickets}
                        </td>
                        <td style={{ 
                          color: '#fff', 
                          textAlign: 'center',
                          padding: '10px',
                          fontSize: '14px'
                        }}>
                          {entry.date}
                        </td>
                        <td style={{ 
                          color: '#fff', 
                          textAlign: 'center',
                          padding: '10px',
                          fontSize: '14px'
                        }}>
                          {t(`payout.status.${entry.status.toLowerCase()}`)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="upgrade__footer">
        <a
          href="#"
          className="upgrade__back-button"
          onClick={(e) => {
            e.preventDefault()
            if (onBack) {
              onBack()
            }
          }}
        >
          {t('header.account.back')}
          <img src={backIcon} alt="back" width="29" height="21" />
        </a>
      </div>
    </section>
  )
}

