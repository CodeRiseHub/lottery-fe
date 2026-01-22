import { useState, useEffect } from 'react'
import { depositStars, fetchCurrentUser } from '../api'

export default function StoreScreen({ onBack, onNavigate, onBalanceUpdate, onUserDataUpdate }) {
  const [amount, setAmount] = useState('50')
  const [tickets, setTickets] = useState('---')
  const [textError, setTextError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const minStars = 50
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
    if (!amount || amount === '') return

    let starsValue = parseFloat(amount) || 0
    starsValue = parseFloat(starsValue.toFixed(2))

    if (starsValue < minStars) {
      setTextError(`Minimum: ${minStars} Stars`)
      return
    } else {
      setTextError('')
    }

    if (starsValue > maxStars) {
      setTextError(`Maximum: ${maxStars} Stars`)
      return
    } else {
      setTextError('')
    }

    // Calculate tickets: 1 star = 0.9 tickets
    let ticketsValue = starsValue * 0.9
    setTickets(numberFormatRuf(ticketsValue.toFixed(4)))
  }

  const handleBuyTickets = async () => {
    if (!amount || amount === '') return

    let starsValue = parseFloat(amount) || 0
    starsValue = parseFloat(starsValue.toFixed(2))

    if (starsValue < minStars || starsValue > maxStars) {
      return
    }

    if (isProcessing) {
      return
    }
    
    setIsProcessing(true)
    setTextError('')

    try {
      // Call backend API to deposit stars (API expects stars amount)
      await depositStars(starsValue)
      
      // Fetch updated user data to get new balance
      const userData = await fetchCurrentUser()
      if (userData) {
        // Update userData in App.jsx so Header and other screens have the latest data
        if (onUserDataUpdate) {
          onUserDataUpdate(userData)
        }
        
        // Format balance for display (balanceA is in bigint format)
        if (onBalanceUpdate) {
          const balanceDisplay = (userData.balanceA / 1_000_000).toFixed(4)
          onBalanceUpdate(balanceDisplay)
        }
      }
      
      // Calculate tickets for the success message
      const ticketsValue = (starsValue * 0.9).toFixed(4)
      alert(`Successfully purchased ${ticketsValue} tickets!`)
    } catch (error) {
      setTextError(error.response?.message || error.message || 'Failed to purchase tickets. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <section className="upgrade">
      <div className="container">
        <h1 className="title">Store</h1>

        <div className="upgrade__store-border">
          <div className="upgrade__store">
            <p className="upgrade__label">Choose the Stars amount:</p>

            <input
              className="upgrade__input"
              placeholder="50"
              type="number"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              id="amountPay"
            />

            {textError && (
              <p className="upgrade__label" style={{ color: 'red', fontWeight: 'bold' }}>
                {textError}
              </p>
            )}

            <p className="upgrade__sub-title">You will receive:</p>
            <p className="upgrade__result">
              <span className="upgrade__number" id="power_gpu">
                {tickets}
              </span>
              <span className="upgrade__unit">&nbsp;Tickets</span>
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
                {isProcessing ? 'PROCESSING...' : 'BUY TICKETS'}
              </a>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

