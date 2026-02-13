import { useState, useEffect } from 'react'
import { fetchPayoutHistory, fetchWithdrawalMethodDetails, createCryptoWithdrawal } from '../api'
import { t, subscribeToLanguageChange } from '../i18n'
import backIcon from '../assets/images/back.png'

const MIN_TICKETS = 100
const MAX_TICKETS = 5_000_000
const WALLET_MAX_LENGTH = 100
const TICKETS_TO_USD = 1000

const CRYPTO_DECIMALS = 10

function formatCryptoReceive(ticketsNum, rateUsd, totalFeeUsd) {
  if (rateUsd == null || rateUsd <= 0 || totalFeeUsd == null) return null
  const ticketsToUsd = ticketsNum / TICKETS_TO_USD
  const ticketsToUsdMinusFee = ticketsToUsd - Number(totalFeeUsd)
  if (ticketsToUsdMinusFee <= 0) return '0'
  const cryptoAmount = ticketsToUsdMinusFee / Number(rateUsd)
  // Truncate to 10 decimal places (no rounding) so displayed amount is never more than actual
  const factor = 10 ** CRYPTO_DECIMALS
  const truncated = Math.floor(cryptoAmount * factor) / factor
  const s = truncated.toFixed(CRYPTO_DECIMALS)
  const trimmed = s.replace(/\.?0+$/, '') || '0'
  return trimmed
}

export default function StarsPayoutConfirmationScreen({ onBack, onBalanceUpdate, onUserDataUpdate, userData, selectedOption }) {
  const [wallet, setWallet] = useState('')
  const [amountTickets, setAmountTickets] = useState('')
  const [methodDetails, setMethodDetails] = useState(null)
  const [loadingMethod, setLoadingMethod] = useState(false)
  const balanceTickets = userData?.balanceA != null ? userData.balanceA : null
  const [walletError, setWalletError] = useState('')
  const [amountError, setAmountError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [payoutHistory, setPayoutHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  const pid = selectedOption?.pid

  useEffect(() => {
    if (pid == null) return
    let cancelled = false
    setLoadingMethod(true)
    fetchWithdrawalMethodDetails(pid)
      .then((data) => {
        if (cancelled) return
        setMethodDetails(data || null)
        if (data) setAmountTickets('100')
      })
      .catch(() => {
        if (!cancelled) setMethodDetails(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingMethod(false)
      })
    return () => { cancelled = true }
  }, [pid])

  useEffect(() => {
    const footer = document.querySelector('.footer')
    if (!footer) return
    const handleTouchMove = (event) => event.preventDefault()
    const handleTouchStart = (event) => event.stopPropagation()
    footer.addEventListener('touchmove', handleTouchMove, { passive: false })
    footer.addEventListener('touchstart', handleTouchStart, { passive: false })
    return () => {
      footer.removeEventListener('touchmove', handleTouchMove)
      footer.removeEventListener('touchstart', handleTouchStart)
    }
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
    const s = value != null ? String(value).trim() : ''
    if (!s) {
      setWalletError(t('withdraw.error.walletRequired'))
      return
    }
    if (s.length > WALLET_MAX_LENGTH) {
      setWalletError(t('withdraw.error.walletMaxLength', { max: WALLET_MAX_LENGTH }))
      return
    }
    setWalletError('')
  }

  const validateAmount = (value) => {
    setAmountError('')
    if (value == null || value === '') return
    const num = parseFloat(value)
    if (Number.isNaN(num) || num <= 0) {
      setAmountError(t('withdraw.error.invalidAmount'))
      return
    }
    if (num < MIN_TICKETS) {
      setAmountError(t('withdraw.error.minTickets', { min: MIN_TICKETS }))
      return
    }
    if (num > MAX_TICKETS) {
      setAmountError(t('withdraw.error.maxTickets', { max: MAX_TICKETS }))
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

  const handleWalletBlur = () => {
    validateWallet(wallet)
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

    const walletTrimmed = wallet != null ? String(wallet).trim() : ''
    if (!walletTrimmed) {
      setWalletError(t('withdraw.error.walletRequired'))
      return
    }
    if (walletTrimmed.length > WALLET_MAX_LENGTH) {
      setWalletError(t('withdraw.error.walletMaxLength', { max: WALLET_MAX_LENGTH }))
      return
    }

    const num = parseFloat(amountTickets)
    if (Number.isNaN(num) || num <= 0) {
      setAmountError(t('withdraw.error.invalidAmount'))
      return
    }
    if (num < MIN_TICKETS) {
      setAmountError(t('withdraw.error.minTickets', { min: MIN_TICKETS }))
      return
    }
    if (num > MAX_TICKETS) {
      setAmountError(t('withdraw.error.maxTickets', { max: MAX_TICKETS }))
      return
    }
    const ticketsBigint = Math.round(num * 1_000_000)
    if (balanceTickets != null && ticketsBigint > balanceTickets) {
      setAmountError(t('withdraw.error.insufficientBalance'))
      return
    }

    if (selectedOption?.pid == null) {
      setSubmitError(t('withdraw.error.tryLater'))
      return
    }

    setIsSubmitting(true)
    try {
      await createCryptoWithdrawal({
        pid: selectedOption.pid,
        wallet: walletTrimmed,
        total: ticketsBigint
      })
      if (onBalanceUpdate && balanceTickets != null) {
        const after = (balanceTickets - ticketsBigint) / 1_000_000
        onBalanceUpdate(after.toFixed(2))
      }
      if (onUserDataUpdate && userData) {
        onUserDataUpdate({ ...userData, balanceA: balanceTickets - ticketsBigint })
      }
      alert(t('withdraw.success'))
      if (onBack) onBack()
    } catch (error) {
      const msg = error.response?.message || error.message || t('withdraw.error.tryLater')
      setSubmitError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const ticketsNum = amountTickets === '' ? NaN : parseFloat(amountTickets)
  const hasValidTickets = !Number.isNaN(ticketsNum) && ticketsNum > 0
  const cryptoReceive =
    methodDetails && hasValidTickets
      ? formatCryptoReceive(ticketsNum, methodDetails.rateUsd, methodDetails.totalFeeUsd)
      : null
  const networkFeeAmount =
    methodDetails?.totalFeeUsd != null ? String(methodDetails.totalFeeUsd) : (loadingMethod ? '...' : '0.01')

  const youWillReceiveDisplay =
    cryptoReceive != null ? cryptoReceive : (amountTickets === '' ? t('withdraw.placeholderReceive') : '0.0000')

  const titleDisplay = selectedOption?.name ?? t('withdraw.title')

  return (
    <section className="payout payout-withdraw">
      <div className="payout__container container">
        <h1 className="payout__title title">{titleDisplay}</h1>

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
                onBlur={handleWalletBlur}
                maxLength={WALLET_MAX_LENGTH}
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
                placeholder={amountTickets === '' ? t('withdraw.placeholderAmount') : undefined}
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
              <p className="payout__label">{t('withdraw.youWillReceive', { crypto: selectedOption?.name ?? '' })}</p>
              <p className="payout__result" id="calc">
                {youWillReceiveDisplay}
              </p>
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

        <p className="payout__note">{t('withdraw.networkFee', { amount: networkFeeAmount })}</p>
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
