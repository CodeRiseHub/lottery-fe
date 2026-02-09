import { useState, useEffect } from 'react'
import { t } from '../i18n'

// 1 USD = 1000 tickets; deposit allows max 2 decimal places (x.xx). "2." is treated as 2.
const USD_TO_TICKETS = 1000
const MIN_USD = 2
const MAX_USD = 10000
const MAX_DECIMAL_PLACES = 2
// More than 2 digits after dot -> invalid (show error). "2." or "2.4" or "2.45" are valid.
const HAS_MORE_THAN_TWO_DECIMALS = /\.\d{3,}$/

export default function StoreScreen({ onBack, onNavigate, onBalanceUpdate, onUserDataUpdate }) {
  const [amount, setAmount] = useState('2')
  const [tickets, setTickets] = useState('---')
  const [textError, setTextError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

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

    const normalized = amount.replace(',', '.')
    if (HAS_MORE_THAN_TWO_DECIMALS.test(normalized)) {
      setTextError(t('store.error.maxTwoDecimals'))
      setTickets('---')
      return
    }

    const usdValue = parseFloat(normalized)
    if (isNaN(usdValue) || usdValue < 0) {
      setTickets('---')
      setTextError('')
      return
    }

    if (usdValue < MIN_USD) {
      setTextError(t('store.minimumUsd', { min: MIN_USD }))
      setTickets('---')
      return
    }
    if (usdValue > MAX_USD) {
      setTextError(t('store.maximumUsd', { max: MAX_USD }))
      setTickets('---')
      return
    }
    setTextError('')

    // 1 USD = 1000 tickets
    const ticketsValue = Math.floor(usdValue * USD_TO_TICKETS)
    setTickets(numberFormatRuf(ticketsValue.toString()))
  }

  const handleBuyTickets = () => {
    if (!amount || amount === '') return

    const normalized = amount.replace(',', '.')
    if (HAS_MORE_THAN_TWO_DECIMALS.test(normalized)) {
      setTextError(t('store.error.maxTwoDecimals'))
      return
    }

    const usdValue = parseFloat(normalized)
    if (isNaN(usdValue) || usdValue < MIN_USD) {
      setTextError(t('store.error.minimumUsd', { min: MIN_USD }))
      return
    }
    if (usdValue > MAX_USD) return
    if (isProcessing) return

    // Round to 2 decimal places for API
    const usdRounded = Math.round(usdValue * 100) / 100
    const ticketsValue = Math.floor(usdRounded * USD_TO_TICKETS)
    if (onNavigate) {
      onNavigate('paymentOptions', { usdAmount: usdRounded, ticketsAmount: ticketsValue })
    }
  }

  return (
    <section className="upgrade">
      <div className="container">
        <h1 className="title">{t('store.title')}</h1>

        <div className="upgrade__store-border">
          <div className="upgrade__store">
            <p className="upgrade__label">{t('store.chooseUsd')}</p>

            <input
              className="upgrade__input"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                const value = e.target.value.replace(',', '.')
                // Allow digits, one decimal point, at most 2 decimal places (2. and 2.45 ok)
                if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                  setAmount(value)
                }
              }}
              onBlur={(e) => {
                const value = e.target.value.trim()
                if (value === '') {
                  setAmount(MIN_USD.toString())
                } else {
                  const num = parseFloat(value.replace(',', '.'))
                  if (isNaN(num) || num < MIN_USD) {
                    setAmount(MIN_USD.toString())
                  } else if (num > MAX_USD) {
                    setAmount(MAX_USD.toString())
                  } else {
                    setAmount(value)
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
              >
                {t('store.buyTickets')}
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

