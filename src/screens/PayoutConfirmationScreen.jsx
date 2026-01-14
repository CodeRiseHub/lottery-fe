import { useState, useEffect } from 'react'
import backIcon from '../assets/images/back.png'

export default function PayoutConfirmationScreen({ onBack }) {
  const [wallet, setWallet] = useState('')
  const [destTag, setDestTag] = useState('')
  const [amount, setAmount] = useState('0.00')
  const [tonAmount, setTonAmount] = useState('0')

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
    alert('Payout request submitted!')
  }

  return (
    <section className="payout">
      <div className="payout__container container">
        <h1 className="payout__title title">Withdraw Toncoin</h1>

        <form action="" method="POST" onSubmit={handleSubmit}>
          <div className="payout__form">
            <div className="payout__field">
              <p className="payout__label">Enter the wallet:</p>
              <textarea
                className="payout__input"
                placeholder="..."
                rows="3"
                wrap="soft"
                name="purse"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
              ></textarea>
            </div>

            <div className="payout__field">
              <p className="payout__label">Destination Tag:</p>
              <input
                type="text"
                className="payout__input"
                placeholder="Optional, can be left empty"
                name="destTag"
                value={destTag}
                onChange={(e) => setDestTag(e.target.value)}
              />
            </div>

            <div className="payout__field">
              <p className="payout__label">Your balance ( USD ):</p>
              <input
                type="text"
                className="payout__input"
                name="sum228"
                placeholder="Min: 0.37 USD"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
              <p className="payout__label">You will receive TON:</p>
              <p className="payout__result" id="calc">
                {tonAmount}
              </p>
            </div>

            <button type="submit" className="payout__button">
              <span>CONFIRM</span>
            </button>

            <input type="hidden" name="control_payment" value="f0ca9d4b9ce23b8989e3f6a6f5638b7f" />
          </div>
        </form>

        <p className="payout__note">Network fee Toncoin: 0.26 USD</p>
        <p className="payout__text">
          The fee is charged at the moment of the withdrawal request. This is not our fee, it's the
          network's fee for sending coins.
        </p>

        <div className="payout__history">
          <p className="payout__history-title">Your last 20 withdrawals</p>

          <div className="payout__history-row payout__history-row--header">
            <p className="payout__history-col">AMOUNT</p>
            <p className="payout__history-col">DATE</p>
            <p className="payout__history-col">STATUS</p>
          </div>

          <div className="payout__history-row" style={{ align: 'center' }}>
            <p className="payout__history-col">&nbsp;</p>
            <p className="payout__history-col">NO DATA</p>
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
            Back
            <img src={backIcon} alt="back" width="29" height="21" />
          </a>
        </div>
      </div>
    </section>
  )
}

