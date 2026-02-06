import { useState, useEffect } from 'react'
import { createPaymentInvoice, cancelPayment, fetchCurrentUser } from '../api'
import { t } from '../i18n'

export default function StoreScreen({ onBack, onNavigate, onBalanceUpdate, onUserDataUpdate }) {
  const [amount, setAmount] = useState('50')
  const [tickets, setTickets] = useState('---')
  const [textError, setTextError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const minStars = 1 // Set to 1 for testing purposes
  const maxStars = 100000

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
    calc()
  }, [amount])

  const numberFormatRuf = (number) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  const calc = () => {
    if (!amount || amount === '') {
      setTickets('---')
      setTextError('')
      return
    }

    // Parse as integer (no floating point allowed)
    let starsValue = parseInt(amount, 10)
    if (isNaN(starsValue) || starsValue < 0) {
      setTickets('---')
      setTextError('')
      return
    }

    if (starsValue < minStars) {
      setTextError(t('store.minimum', { min: minStars }))
      setTickets('---')
      return
    } else {
      setTextError('')
    }

    if (starsValue > maxStars) {
      setTextError(t('store.maximum', { max: maxStars }))
      setTickets('---')
      return
    } else {
      setTextError('')
    }

    // Calculate tickets: 1 star = 9 tickets
    let ticketsValue = starsValue * 9
    setTickets(numberFormatRuf(Math.floor(ticketsValue).toString()))
  }

  const handleBuyTickets = async () => {
    if (!amount || amount === '') return

    // Parse as integer (no floating point allowed)
    let starsValue = parseInt(amount, 10) || 0
    if (isNaN(starsValue) || starsValue < 1) {
      setTextError(t('store.error.minimumStars', { min: minStars }))
      return
    }

    if (starsValue < minStars || starsValue > maxStars) {
      return
    }

    if (isProcessing) {
      return
    }

    // Check if Telegram WebApp is available
    const tg = window.Telegram?.WebApp
    if (!tg) {
      setTextError(t('store.error.telegramNotAvailable'))
      return
    }

    setIsProcessing(true)
    setTextError('')

    try {
      // Step 1: Create payment invoice via backend
      const invoiceData = await createPaymentInvoice(starsValue)
      const orderId = invoiceData.invoiceId
      const invoiceUrl = invoiceData.invoiceUrl

      if (!invoiceUrl) {
        throw new Error(t('store.error.invoiceUrlNotReceived'))
      }

      // Step 2: Open Telegram payment UI
      // openInvoice accepts invoice URLs from createInvoiceLink
      tg.openInvoice(invoiceUrl, async (status) => {
        setIsProcessing(false)

        if (status === 'paid') {
          // Payment successful - Telegram has processed the payment
          // Backend will receive webhook from bot and credit balance
          // We need to poll or wait a bit, then sync balance
          setTimeout(async () => {
            try {
              // Fetch updated user data to get new balance
              const userData = await fetchCurrentUser()
              if (userData) {
                // Update userData in App.jsx so Header and other screens have the latest data
                if (onUserDataUpdate) {
                  onUserDataUpdate(userData)
                }

                // Format balance for display (balanceA is in bigint format)
                if (onBalanceUpdate) {
                  const balanceDisplay = (userData.balanceA / 1_000_000).toFixed(2)
                  onBalanceUpdate(balanceDisplay)
                }
              }

              // Calculate tickets for the success message
              const ticketsValue = Math.floor(starsValue * 9)
              tg.showAlert(`Successfully purchased ${ticketsValue} tickets!`)
            } catch (error) {
              console.error('Error syncing balance after payment:', error)
              // Don't show error to user - payment was successful, balance will sync eventually
            }
          }, 1000) // Wait 1 second for backend to process webhook
        } else if (status === 'cancelled') {
          // User cancelled payment
          try {
            await cancelPayment(orderId)
          } catch (error) {
            console.error('Error cancelling payment:', error)
          }
        } else if (status === 'failed') {
          // Payment failed
          setTextError(t('store.error.paymentFailed'))
        } else {
          // Unknown status
          setTextError(t('store.error.statusUnknown'))
        }
      })
    } catch (error) {
      setIsProcessing(false)

      // Handle rate limit error specifically
      if (error.response?.status === 429) {
        setTextError(t('store.error.tooManyRequests'))
      } else {
        setTextError(error.response?.data?.message || error.response?.message || error.message || t('store.error.failedToCreate'))
      }
    }
  }

  return (
    <section className="upgrade">
      <div className="container">
        <h1 className="title">{t('store.title')}</h1>

        <div className="upgrade__store-border">
          <div className="upgrade__store">
            <p className="upgrade__label">{t('store.chooseStars')}</p>

            <input
              className="upgrade__input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={amount}
              onChange={(e) => {
                const value = e.target.value
                // Only allow integers (no decimal point, no negative)
                // Allow empty string so user can clear the field
                if (value === '' || /^\d+$/.test(value)) {
                  setAmount(value)
                }
              }}
              onBlur={(e) => {
                // Ensure value is a valid integer on blur
                const value = e.target.value.trim()
                if (value === '') {
                  // If empty, set to minimum value
                  setAmount(minStars.toString())
                } else {
                  const intValue = parseInt(value, 10)
                  if (isNaN(intValue) || intValue < minStars) {
                    setAmount(minStars.toString())
                  } else if (intValue > maxStars) {
                    setAmount(maxStars.toString())
                  } else {
                    setAmount(intValue.toString())
                  }
                }
              }}
              id="amountPay"
            />

            {textError && (
              <p className="upgrade__label" style={{ color: 'red', fontWeight: 'bold' }}>
                {textError}
              </p>
            )}

            <p className="upgrade__sub-title">{t('store.youWillReceive')}</p>
            <p className="upgrade__result">
              <span className="upgrade__number" id="power_gpu">
                {tickets}
              </span>
              <span className="upgrade__unit">&nbsp;{t('store.tickets')}</span>
            </p>
            <span className="upgrade__button-border">
              <a
                href="#"
                className="upgrade__button"
                id="payNext"
                onClick={(e) => {
                  e.preventDefault()
                  handleBuyTickets()
                }}
                style={{ opacity: isProcessing ? 0.6 : 1, pointerEvents: isProcessing ? 'none' : 'auto' }}
              >
                {isProcessing ? t('store.processing') : t('store.buyTickets')}
              </a>
            </span>
          </div>
        </div>

        {/* Daily Bonus Section */}
        <div className="upgrade__store-border" style={{ marginTop: '30px' }}>
          <div className="upgrade__store">
            <span className="upgrade__button-border">
              <a
                href="#"
                className="upgrade__button"
                onClick={(e) => {
                  e.preventDefault()
                  if (onNavigate) {
                    onNavigate('dailyBonus')
                  }
                }}
                style={{
                  background: 'var(--gradient-primary)',
                  cursor: 'pointer'
                }}
              >
                {t('store.dailyBonus')}
              </a>
            </span>

            <p className='upgrade__daily-text'>{t('store.dailyBonusText')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

