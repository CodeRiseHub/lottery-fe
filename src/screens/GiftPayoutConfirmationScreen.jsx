import { useState, useEffect } from 'react'
import { createPayout, fetchCurrentUser } from '../api'
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

const gifts = [
  { id: 'heart', name: 'Heart', image: heartImg, price: 18 },
  { id: 'bear', name: 'Bear', image: bearImg, price: 18 },
  { id: 'giftbox', name: 'Gift Box', image: giftboxImg, price: 28 },
  { id: 'flower', name: 'Flower', image: flowerImg, price: 28 },
  { id: 'cake', name: 'Cake', image: cakeImg, price: 55 },
  { id: 'bouquet', name: 'Bouquet', image: bouquetImg, price: 55 },
  { id: 'rocket', name: 'Rocket', image: rocketImg, price: 55 },
  { id: 'champagne', name: 'Champagne', image: champagneImg, price: 55 },
  { id: 'cup', name: 'Cup', image: cupImg, price: 110 },
  { id: 'ring', name: 'Ring', image: ringImg, price: 110 },
  { id: 'diamond', name: 'Diamond', image: diamondImg, price: 110 },
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
      setUsernameError('Username must start with @ followed by at least one English letter')
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
      setGiftError('Please select a gift')
      return
    }

    // Check if there are any errors
    const usernamePattern = /^@[a-zA-Z]/
    if (!username || !usernamePattern.test(username)) {
      setUsernameError('Username must start with @ followed by at least one English letter')
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
          const balanceDisplay = (userData.balanceA / 1_000_000).toFixed(4)
          onBalanceUpdate(balanceDisplay)
        }
      }

      alert('Gift payout request submitted successfully!')
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
        <h1 className="payout__title title">Send Gift</h1>

        <form action="" method="POST" onSubmit={handleSubmit}>
          <div className="payout__form">
            <div className="payout__field">
              <p className="payout__label">Enter the Username:</p>
              <input
                type="text"
                className="payout__input"
                placeholder="@username"
                name="username"
                value={username}
                onChange={handleUsernameChange}
                style={{ height: '42px', fontSize: '22px', textAlign: 'center' }}
              />
              {usernameError && (
                <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>{usernameError}</p>
              )}
            </div>

            <div className="payout__field" style={{ position: 'relative' }}>
              <p className="payout__label">Choose a gift:</p>
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
                    <img src={selectedGift.image} alt={selectedGift.name} width="30" height="30" />
                    <span>{selectedGift.name}</span>
                  </div>
                ) : (
                  <span style={{ color: '#999', width: '100%', textAlign: 'center' }}>Select a gift</span>
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
                      <img src={gift.image} alt={gift.name} width="50" height="50" />
                      <span style={{ marginTop: '5px', fontSize: '12px', textAlign: 'center' }}>{gift.name}</span>
                      <span style={{ marginTop: '2px', fontSize: '10px', color: '#999' }}>{gift.price} Tickets</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="payout__field">
              <p className="payout__label">Select the number:</p>
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
              <p className="payout__label">Your balance (Tickets):</p>
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
              <span>{isSubmitting ? 'SUBMITTING...' : 'CONFIRM'}</span>
            </button>
          </div>
        </form>

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
            Back
            <img src={backIcon} alt="back" width="29" height="21" />
          </a>
        </div>
      </div>
    </section>
  )
}

