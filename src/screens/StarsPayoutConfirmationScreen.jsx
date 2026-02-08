import { useState, useEffect } from 'react'
import { fetchCurrentUser, fetchPayoutHistory } from '../api'
import { t, subscribeToLanguageChange } from '../i18n'
import backIcon from '../assets/images/back.png'

const NETWORK_FEE_USD = '0.01'
const MIN_WITHDRAW_USD = '0.05'

export default function StarsPayoutConfirmationScreen({ onBack, onBalanceUpdate, onUserDataUpdate }) {
  const [wallet, setWallet] = useState('')
  const [amountTickets, setAmountTickets] = useState('')
  const [balanceTickets, setBalanceTickets] = useState(null) // user balance in tickets (bigint scale)
  const [walletError, setWalletError] = useState('')
  const [amountError, setAmountError] = useState('')
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
    const loadUserData = async () => {
      try {
        const userData = await fetchCurrentUser()
        if (userData != null && userData.balanceA != null) {
          setBalanceTickets(userData.balanceA)
        }
      } catch (error) {
        console.error('Failed to load user data:', error)
      }
    }
    loadUserData()
  }, [])

  useEffect(() => {
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
    return () => { unsubscribe() }
  }, [])

  const validateWallet = (value) => {
    if (!value || !String(value).trim()) {
      setWalletError(t('withdraw.error.walletRequired'))
    } else {
      setWalletError('')
    }
  }

  const validateAmount = (value) => {
    setAmountError('')
    if (value == null || value === '') return
    const num = parseFloat(value)
    if (Number.isNaN(num) || num <= 0) {
      setAmountError(t('withdraw.error.invalidAmount'))
      return
    }
    const ticketsBigint = Math.round(num * 1_000_000)
    if (balanceTickets != null && ticketsBigint > balanceTickets) {
      setAmountError(t('withdraw.error.insufficientBalance'))
    }
  }

  const handleWalletChange = (e) => {
    setWallet(e.target.value)
    if (walletError) validateWallet(e.target.value)
  }

  const handleAmountChange = (e) => {
    const v = e.target.value
    setAmountTickets(v)
    validateAmount(v)
  }

  const handleAmountBlur = () => {
    validateAmount(amountTickets)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setWalletError('')
    setAmountError('')
    setSubmitError('')

    validateWallet(wallet)
    if (!wallet || !String(wallet).trim()) {
      setWalletError(t('withdraw.error.walletRequired'))
      return
    }

    const num = parseFloat(amountTickets)
    if (Number.isNaN(num) || num <= 0) {
      setAmountError(t('withdraw.error.invalidAmount'))
      return
    }
    const ticketsBigint = Math.round(num * 1_000_000)
    if (balanceTickets != null && ticketsBigint > balanceTickets) {
      setAmountError(t('withdraw.error.insufficientBalance'))
      return
    }

    setIsSubmitting(true)
    try {
      // TODO: call crypto withdraw API when backend supports it (wallet, amount, selectedOption)
      // await createCryptoPayout({ wallet: wallet.trim(), total: ticketsBigint, ... })
      if (onBalanceUpdate && balanceTickets != null) {
        const after = (balanceTickets - ticketsBigint) / 1_000_000
        onBalanceUpdate(after.toFixed(2))
      }
      alert(t('withdraw.success'))
      if (onBack) onBack()
    } catch (error) {
      const msg = error.response?.message || error.message || 'Failed to submit withdrawal'
      setSubmitError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const youWillReceive = t('withdraw.minAmountUsd', { amount: MIN_WITHDRAW_USD })

  return (
    <section className="payout payout-withdraw">
      <div className="payout__container container">
        <h1 className="payout__title title">{t('withdraw.title')}</h1>

        <form action="" method="POST" onSubmit={handleSubmit}>
          <div className="payout__form">
            <div className="payout__field">
              <p className="payout__label">{t('withdraw.enterWallet')}</p>
              <textarea
                className="payout__input"
                placeholder="..."
                rows={3}
                wrap="soft"
                name="purse"
                value={wallet}
                onChange={handleWalletChange}
              />
              {walletError && (
                <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>{walletError}</p>
              )}
            </div>

            <div className="payout__field">
              <p className="payout__label">{t('withdraw.yourBalanceTickets')}</p>
              <input
                type="text"
                className="payout__input"
                name="amount"
                placeholder={t('withdraw.placeholderAmount')}
                value={amountTickets}
                onChange={handleAmountChange}
                onBlur={handleAmountBlur}
                style={{ height: '42px', fontSize: '22px', textAlign: 'center' }}
              />
              {amountError && (
                <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>{amountError}</p>
              )}
            </div>

            <div className="payout__field payout__field--result">
              <p className="payout__label">{t('withdraw.youWillReceive')}</p>
              <p className="payout__result" id="calc">{youWillReceive}</p>
            </div>

            {submitError && (
              <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '10px', textAlign: 'center' }}>
                {submitError}
              </p>
            )}
            <button type="submit" className="payout__button" disabled={isSubmitting}>
              <span>{isSubmitting ? t('withdraw.submitting') : t('withdraw.confirm')}</span>
            </button>
          </div>
        </form>

        <p className="payout__note">{t('withdraw.networkFee', { amount: NETWORK_FEE_USD })}</p>
        <p className="payout__text">{t('withdraw.networkFeeNote')}</p>

        <div className="payout__history">
          <p className="payout__history-title">{t('withdraw.historyTitle')}</p>

          <div className="payout__history-row payout__history-row--header">
            <p className="payout__history-col">{t('withdraw.historyAmount')}</p>
            <p className="payout__history-col">{t('withdraw.historyDate')}</p>
            <p className="payout__history-col">{t('withdraw.historyStatus')}</p>
          </div>

          {loadingHistory ? (
            <div className="payout__history-row">
              <p className="payout__history-col">&nbsp;</p>
              <p className="payout__history-col">{t('withdraw.historyLoading')}</p>
              <p className="payout__history-col">&nbsp;</p>
            </div>
          ) : payoutHistory.length === 0 ? (
            <div className="payout__history-row">
              <p className="payout__history-col">&nbsp;</p>
              <p className="payout__history-col">{t('withdraw.historyNoData')}</p>
              <p className="payout__history-col">&nbsp;</p>
            </div>
          ) : (
            payoutHistory.slice(0, 20).map((entry, index) => {
              const amountInTickets = Math.floor(entry.amount / 1_000_000)
              const statusNorm = (entry.status || '').toUpperCase()
              const statusClass =
                statusNorm === 'CANCELLED'
                  ? 'payout__history-col-status'
                  : statusNorm === 'COMPLETED'
                    ? 'payout__history-col-success'
                    : 'payout__history-col-processing'
              return (
                <div key={`${entry.date}-${index}`} className="payout__history-row">
                  <p className="payout__history-col payout__history-col-amount">{amountInTickets}</p>
                  <p className="payout__history-col">{entry.date}</p>
                  <p className={`payout__history-col ${statusClass}`}>
                    {t(`payout.status.${entry.status.toLowerCase()}`)}
                  </p>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="upgrade__footer">
        <button
          type="button"
          className="upgrade__back-button"
          onClick={() => onBack && onBack()}
        >
          {t('withdraw.back')}
          <img src={backIcon} alt="back" width={29} height={21} />
        </button>
      </div>
    </section>
  )
}
