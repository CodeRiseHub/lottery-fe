import { useState, useEffect } from 'react'

export default function StoreScreen({ onBack, onNavigate, onBalanceUpdate }) {
  const [amount, setAmount] = useState('3')
  const [tickets, setTickets] = useState('---')
  const [textError, setTextError] = useState('')

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

    // Calculate tickets: 1 USD = 10 tickets
    let ticketsValue = sumInUSD * 10
    setTickets(numberFormatRuf(ticketsValue))
  }

  const handleBuyTickets = () => {
    if (!amount || amount === '') return

    let sumInUSD = parseFloat(amount) || 0
    sumInUSD = parseFloat(sumInUSD.toFixed(2))

    if (sumInUSD < minSumUSD || sumInUSD > maxSumUSD) {
      return
    }

    // Calculate tickets: 1 USD = 10 tickets
    let ticketsValue = sumInUSD * 10
    
    // Update balance (add tickets to current balance)
    if (onBalanceUpdate) {
      onBalanceUpdate(ticketsValue)
    }
    
    // TODO: Show success message
    alert(`Successfully purchased ${ticketsValue} tickets!`)
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
              >
                BUY TICKETS
              </a>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

