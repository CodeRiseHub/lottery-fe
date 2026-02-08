import { useState, useEffect } from 'react'
import { createPayout, fetchCurrentUser, fetchPayoutHistory } from '../api'
import { t, subscribeToLanguageChange } from '../i18n'
import backIcon from '../assets/images/back.png'
import starImg from '../assets/purchase/star_1.png'

// Allowed stars amounts for payout (must match backend). Conversion: 1 Star = 12 tickets.
const STARS_OPTIONS = [50, 75, 100, 150, 250, 350, 500, 750, 2500, 10000, 25000, 35000]
const STARS_TO_TICKETS = 12

export default function StarsPayoutConfirmationScreen({ onBack, onBalanceUpdate, onUserDataUpdate }) {
  const [username, setUsername] = useState('')
  const [selectedStars, setSelectedStars] = useState(null)
  const [balanceTickets, setBalanceTickets] = useState('0')
  const [usernameError, setUsernameError] = useState('')
  const [starsError, setStarsError] = useState('')
  const [showStarsDropdown, setShowStarsDropdown] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [payoutHistory, setPayoutHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)

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
    // Pre-populate username from userData
    const loadUserData = async () => {
      try {
        const userData = await fetchCurrentUser()
        if (userData && userData.username) {
          // Add "@" prefix if not already present
          const username = userData.username.startsWith('@') 
            ? userData.username 
            : `@${userData.username}`
          setUsername(username)
        }
      } catch (error) {
        console.error('Failed to load user data:', error)
      }
    }
    loadUserData()
  }, [])

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.querySelector('[data-stars-dropdown]')
      const trigger = document.querySelector('[data-stars-trigger]')
      if (showStarsDropdown && dropdown && trigger &&
          !dropdown.contains(event.target) && !trigger.contains(event.target)) {
        setShowStarsDropdown(false)
      }
    }
    if (showStarsDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showStarsDropdown])

  useEffect(() => {
    if (selectedStars != null) {
      const tickets = selectedStars * STARS_TO_TICKETS
      setBalanceTickets(tickets.toString())
      setStarsError('')
    } else {
      setBalanceTickets('0')
    }
  }, [selectedStars])

  const validateUsername = (value) => {
    // Username should start with @ followed by at least 1 English letter
    const usernamePattern = /^@[a-zA-Z]/
    if (value && !usernamePattern.test(value)) {
      setUsernameError(t('starsPayout.error.usernameInvalid'))
    } else {
      setUsernameError('')
    }
  }

  const handleUsernameChange = (e) => {
    const value = e.target.value
    setUsername(value)
    validateUsername(value)
  }

  const handleStarsSelect = (stars) => {
    setSelectedStars(stars)
    setShowStarsDropdown(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Reset errors
    setUsernameError('')
    setStarsError('')
    setSubmitError('')

    // Validate username
    validateUsername(username)
    
    if (selectedStars == null) {
      setStarsError(t('starsPayout.error.selectAmount'))
      return
    }

    // Check if there are any errors
    const usernamePattern = /^@[a-zA-Z]/
    if (!username || !usernamePattern.test(username)) {
      setUsernameError(t('starsPayout.error.usernameInvalid'))
      return
    }

    setIsSubmitting(true)
    try {
      const tickets = selectedStars * STARS_TO_TICKETS
      await createPayout({
        username: username.trim(),
        total: tickets * 1_000_000, // Convert to bigint format
        starsAmount: selectedStars,
        type: 'STARS',
        giftName: null,
        quantity: 1
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

      alert(t('starsPayout.success'))
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
        <h1 className="payout__title title">{t('starsPayout.title')}</h1>

        <form action="" method="POST" onSubmit={handleSubmit}>
          <div className="payout__form">
            <div className="payout__field">
              <p className="payout__label">{t('starsPayout.enterUsername')}</p>
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
              <p className="payout__label">{t('starsPayout.youWillReceive')}</p>
              <div
                className="payout__input"
                data-stars-trigger
                onClick={(e) => {
                  e.stopPropagation()
                  setShowStarsDropdown(!showStarsDropdown)
                }}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: '42px',
                  padding: '10px'
                }}
              >
                {selectedStars != null ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={starImg} alt="" width="30" height="30" />
                    <span>{selectedStars}</span>
                  </div>
                ) : (
                  <span style={{ color: '#999', width: '100%', textAlign: 'center' }}>{t('starsPayout.selectAmount')}</span>
                )}
              </div>
              {starsError && (
                <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>{starsError}</p>
              )}
              {showStarsDropdown && (
                <div
                  data-stars-dropdown
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
                  {STARS_OPTIONS.map((stars) => (
                    <div
                      key={stars}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStarsSelect(stars)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px',
                        cursor: 'pointer',
                        borderRadius: '5px',
                        border: selectedStars === stars ? '2px solid #28a745' : '1px solid #3d4f65',
                        backgroundColor: selectedStars === stars ? '#1e2a35' : 'transparent'
                      }}
                    >
                      <img src={starImg} alt="" width="28" height="28" />
                      <span style={{ fontSize: '14px' }}>{stars}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="payout__field payout__field--result">
              <p className="payout__label">{t('starsPayout.yourBalance')}</p>
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
              <span>{isSubmitting ? t('starsPayout.submitting') : t('starsPayout.confirm')}</span>
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
            {t('starsPayout.history.title')}
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
                  }}>{t('starsPayout.history.amount')}</th>
                  <th style={{ 
                    color: '#fff', 
                    textAlign: 'center', 
                    padding: '10px',
                    borderBottom: '1px solid #3d4f65',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>{t('starsPayout.history.date')}</th>
                  <th style={{ 
                    color: '#fff', 
                    textAlign: 'center', 
                    padding: '10px',
                    borderBottom: '1px solid #3d4f65',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>{t('starsPayout.history.status')}</th>
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
                      {t('starsPayout.history.loading')}
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
                      {t('starsPayout.history.noData')}
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

