import { useState, useEffect } from 'react'
import { depositStars, fetchCurrentUser } from '../api'

export default function StoreScreen({ onBack, onNavigate, onBalanceUpdate }) {
  const [amount, setAmount] = useState('3')
  const [stars, setStars] = useState('---')
  const [textError, setTextError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const minSumUSD = 3
  const maxSumUSD = 100000

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

    let sumInUSD = parseFloat(amount) || 0
    sumInUSD = parseFloat(sumInUSD.toFixed(2))

    if (sumInUSD < minSumUSD) {
      setTextError(`Minimum: ${minSumUSD} USD`)
      return
    } else {
      setTextError('')
    }

    if (sumInUSD > maxSumUSD) {
      setTextError(`Maximum: ${maxSumUSD} USD`)
      return
    } else {
      setTextError('')
    }

    // Calculate stars: 1 USD = 10 stars
    let starsValue = sumInUSD * 10
    setStars(numberFormatRuf(starsValue))
  }

  const handleBuyStars = async () => {
    if (!amount || amount === '') return

    let sumInUSD = parseFloat(amount) || 0
    sumInUSD = parseFloat(sumInUSD.toFixed(2))

    if (sumInUSD < minSumUSD || sumInUSD > maxSumUSD) {
      return
    }

    if (isProcessing) {
      return
    }

    // Calculate stars: 1 USD = 10 stars
    let starsValue = sumInUSD * 10
    
    setIsProcessing(true)
    setTextError('')

    try {
      // Call backend API to deposit stars
      await depositStars(starsValue)
      
      // Fetch updated user data to get new balance
      const userData = await fetchCurrentUser()
      if (userData && onBalanceUpdate) {
        // Format balance for display (balanceA is in bigint format)
        const balanceDisplay = (userData.balanceA / 1_000_000).toFixed(4)
        onBalanceUpdate(balanceDisplay)
      }
      
      alert(`Successfully purchased ${starsValue} stars!`)
    } catch (error) {
      setTextError(error.response?.message || error.message || 'Failed to purchase stars. Please try again.')
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
            <p className="upgrade__label">Choose the USD amount:</p>

            <input
              className="upgrade__input"
              placeholder="10"
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
                {stars}
              </span>
              <span className="upgrade__unit">&nbsp;Stars</span>
            </p>
            <span className="upgrade__button-border">
              <a
                href="#"
                className="upgrade__button"
                id="payNext"
                onClick={(e) => {
                  e.preventDefault()
                  handleBuyStars()
                }}
                style={{ opacity: isProcessing ? 0.6 : 1, pointerEvents: isProcessing ? 'none' : 'auto' }}
              >
                {isProcessing ? 'PROCESSING...' : 'BUY STARS'}
              </a>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

