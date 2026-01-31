import { useState, useEffect, useRef } from 'react'
import { t } from '../i18n'
import backIcon from '../assets/images/back.png'

export default function PayoutConfirmationScreen({ onBack }) {
  const [wallet, setWallet] = useState('')
  const [destTag, setDestTag] = useState('')
  const [amount, setAmount] = useState('0.00')
  const [tonAmount, setTonAmount] = useState('0')
  const walletInputRef = useRef(null)
  const destTagInputRef = useRef(null)
  const amountInputRef = useRef(null)

  // Reset form state when component mounts (fixes Telegram Desktop focus issue)
  useEffect(() => {
    setWallet('')
    setDestTag('')
    setAmount('0.00')
    
    // Fix Telegram Desktop focus issue: ensure inputs are editable after navigation
    // This happens because Telegram Desktop may block input events after navigation
    const fixInputFocus = () => {
      const inputs = [walletInputRef.current, destTagInputRef.current, amountInputRef.current]
      inputs.forEach(input => {
        if (input) {
          // Remove any attributes that might block input
          input.removeAttribute('readonly')
          input.removeAttribute('disabled')
          // Force a reflow to reset any internal state
          input.style.pointerEvents = 'auto'
          // Ensure the input can receive focus
          input.tabIndex = 0
        }
      })
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

  useEffect(() => {
    // Calculate TON amount based on USD amount
    const comissionAIC = 26
    const minPayAIC = 37
    const priceCoin = 1.74613739

    const payAIC = parseFloat(amount) * 100 || 0

    if (isNaN(payAIC) || payAIC < minPayAIC) {
      setTonAmount('0')
      return
    }

    let sumWUC = payAIC - comissionAIC
    let amountCoinsToPay = ((sumWUC / 100) / priceCoin).toFixed(6)
    setTonAmount(amountCoinsToPay)
  }, [amount])

  const handleSubmit = (e) => {
    e.preventDefault()
    // TODO: Handle payout submission
    alert(t('payoutConfirmation.success'))
  }

  return (
    <section className="payout">
      <div className="payout__container container">
        <h1 className="payout__title title">{t('payoutConfirmation.title')}</h1>

        <form action="" method="POST" onSubmit={handleSubmit}>
          <div className="payout__form">
            <div className="payout__field">
              <p className="payout__label">{t('payoutConfirmation.enterWallet')}</p>
              <textarea
                ref={walletInputRef}
                className="payout__input"
                placeholder={t('payoutConfirmation.walletPlaceholder')}
                rows="3"
                wrap="soft"
                name="purse"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
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
              ></textarea>
            </div>

            <div className="payout__field">
              <p className="payout__label">{t('payoutConfirmation.destinationTag')}</p>
              <input
                ref={destTagInputRef}
                type="text"
                className="payout__input"
                placeholder={t('payoutConfirmation.destinationTagPlaceholder')}
                name="destTag"
                value={destTag}
                onChange={(e) => setDestTag(e.target.value)}
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
              />
            </div>

            <div className="payout__field">
              <p className="payout__label">{t('payoutConfirmation.yourBalance')}</p>
              <input
                ref={amountInputRef}
                type="text"
                className="payout__input"
                name="sum228"
                placeholder={t('payoutConfirmation.minAmount')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
              />

              <input
                type="hidden"
                className="withdraw-next__input"
                name="sum"
                id="sum"
                value={amount}
                readOnly
              />
            </div>

            <div className="payout__field payout__field--result">
              <p className="payout__label">{t('payoutConfirmation.youWillReceive')}</p>
              <p className="payout__result" id="calc">
                {tonAmount}
              </p>
            </div>

            <button type="submit" className="payout__button">
              <span>{t('payoutConfirmation.confirm')}</span>
            </button>

            <input type="hidden" name="control_payment" value="f0ca9d4b9ce23b8989e3f6a6f5638b7f" />
          </div>
        </form>

        <p className="payout__note">{t('payoutConfirmation.networkFee')}</p>
        <p className="payout__text">
          {t('payoutConfirmation.feeDescription')}
        </p>

        <div className="payout__history">
          <p className="payout__history-title">{t('payoutConfirmation.historyTitle')}</p>

          <div className="payout__history-row payout__history-row--header">
            <p className="payout__history-col">{t('payoutConfirmation.historyAmount')}</p>
            <p className="payout__history-col">{t('payoutConfirmation.historyDate')}</p>
            <p className="payout__history-col">{t('payoutConfirmation.historyStatus')}</p>
          </div>

          <div className="payout__history-row" style={{ align: 'center' }}>
            <p className="payout__history-col">&nbsp;</p>
            <p className="payout__history-col">{t('payoutConfirmation.noData')}</p>
            <p className="payout__history-col">&nbsp;</p>
          </div>
        </div>
        <br />
        <br />
        <br />
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
      </div>
    </section>
  )
}

