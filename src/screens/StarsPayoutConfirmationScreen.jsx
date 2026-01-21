import { useState, useEffect } from 'react'
import { createPayout, fetchCurrentUser } from '../api'
import backIcon from '../assets/images/back.png'

export default function StarsPayoutConfirmationScreen({ onBack, onBalanceUpdate, onUserDataUpdate }) {
  const [username, setUsername] = useState('')
  const [starsAmount, setStarsAmount] = useState('')
  const [balanceTickets, setBalanceTickets] = useState('0')
  const [usernameError, setUsernameError] = useState('')
  const [starsError, setStarsError] = useState('')
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

  useEffect(() => {
    // Calculate balance (Tickets) based on Stars amount with 1.1 conversion rate
    const stars = parseFloat(starsAmount) || 0
    
    if (stars > 0) {
      const tickets = (stars * 1.1).toFixed(1)
      setBalanceTickets(tickets)
    } else {
      setBalanceTickets('0')
    }

    // Validate minimum stars
    if (starsAmount && stars < 15) {
      setStarsError('Minimum 15 Stars required')
    } else {
      setStarsError('')
    }
  }, [starsAmount])

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

  const handleStarsChange = (e) => {
    const value = e.target.value
    setStarsAmount(value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Reset errors
    setUsernameError('')
    setStarsError('')
    setSubmitError('')

    // Validate username
    validateUsername(username)
    
    // Validate stars
    const stars = parseFloat(starsAmount) || 0
    if (stars < 15) {
      setStarsError('Minimum 15 Stars required')
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
      const response = await createPayout({
        username: username.trim(),
        total: tickets,
        starsAmount: Math.round(stars),
        type: 'STARS',
        giftName: null
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

      alert('Stars payout request submitted successfully!')
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
        <h1 className="payout__title title">Withdraw Stars</h1>

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

            <div className="payout__field">
              <p className="payout__label">You will receive Stars:</p>
              <input
                type="text"
                className="payout__input"
                name="stars"
                placeholder="Min: 15 Stars"
                value={starsAmount}
                onChange={handleStarsChange}
              />
              {starsError && (
                <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>{starsError}</p>
              )}
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

