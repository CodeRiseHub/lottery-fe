import { useState, useEffect } from 'react'
import { t } from '../i18n'
import backIcon from '../assets/images/back.png'
import { fetchDepositMethods, fetchMinimumDeposit, requestDepositAddress } from '../api'

const FALLBACK_MIN_USD = 2

// Crypto icons: bundle from src/assets/crypto_new via Vite glob; fallback to public path
const cryptoIconModules = import.meta.glob('../assets/crypto_new/*.png', { eager: true, query: '?url', import: 'default' })
const cryptoIconMap = {}
Object.keys(cryptoIconModules).forEach((path) => {
  const match = path.match(/(\d+)\.png$/)
  if (match) cryptoIconMap[match[1]] = cryptoIconModules[path]
})
function getCryptoIconUrl(pid) {
  const url = cryptoIconMap[String(pid)]
  return url != null ? url : `/assets/crypto_new/${pid}.png`
}

export default function PaymentOptionsScreen({ onBack, onNavigate, usdAmount, ticketsAmount }) {
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [minUsd, setMinUsd] = useState(FALLBACK_MIN_USD)
  const [fetchingAddress, setFetchingAddress] = useState(false)
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchMinimumDeposit()
      .then((data) => {
        if (cancelled) return
        const min = data?.minimumDeposit != null ? Number(data.minimumDeposit) : FALLBACK_MIN_USD
        setMinUsd(min >= 0 ? min : FALLBACK_MIN_USD)
      })
      .catch(() => { if (!cancelled) setMinUsd(FALLBACK_MIN_USD) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchDepositMethods()
      .then((data) => {
        if (cancelled) return
        setMethods(Array.isArray(data?.activeMethods) ? data.activeMethods : [])
      })
      .catch(() => {
        if (!cancelled) setMethods([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const handleSelectCrypto = async (option) => {
    const usd = usdAmount != null ? Number(usdAmount) : 0
    const minForNetwork = option.minDepositSum != null ? Number(option.minDepositSum) : 0
    if (minForNetwork > 0 && usd < minForNetwork) {
      if (onNavigate) {
        onNavigate('paymentError', {
          minDepositForNetwork: minForNetwork,
          usdAmount,
          ticketsAmount
        })
      }
      return
    }
    if (usd < minUsd) {
      setFetchError(t('store.error.minimumUsd', { min: minUsd }))
      return
    }
    setFetchError(null)
    setFetchingAddress(true)
    try {
      const result = await requestDepositAddress(option.pid, usd)
      if (onNavigate && result) {
        onNavigate('paymentConfirmation', {
          selectedOption: { name: result.name, network: result.network },
          amountToSend: result.amountCoins ?? '',
          walletAddress: result.address ?? '',
          usdAmount,
          ticketsAmount,
          minDeposit: result.minAmount != null ? result.minAmount : minUsd
        })
      }
    } catch (e) {
      setFetchError(e?.message || t('store.error.paymentFailed'))
    } finally {
      setFetchingAddress(false)
    }
  }

  return (
    <section className="upgrade payment-options">
      <div className="upgrade__container container">
        <h1 className="upgrade__title title">{t('store.ticketsStore')}</h1>

        {fetchError && (
          <p className="upgrade__label" style={{ textAlign: 'center', color: 'var(--color-error, #e53e3e)', marginBottom: '0.5rem' }}>
            {fetchError}
          </p>
        )}
        <div className="upgrade__currencies payment-options__list-wrap">
          {loading ? (
            <p className="upgrade__label" style={{ textAlign: 'center' }}>{t('common.loading') || 'Loading...'}</p>
          ) : fetchingAddress ? (
            <p className="upgrade__label" style={{ textAlign: 'center' }}>{t('common.loading') || 'Loading...'}</p>
          ) : (
            <div className="upgrade__list">
              {methods.map((option) => (
                <button
                  key={`${option.pid}-${option.network}`}
                  type="button"
                  className="upgrade__item"
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%', padding: 0, font: 'inherit' }}
                  onClick={() => handleSelectCrypto(option)}
                >
                  <img
                    src={getCryptoIconUrl(option.pid)}
                    alt={option.name}
                    width={61}
                    height={60}
                    className="upgrade__icon"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                  <div className="upgrade__info">
                    <p className="upgrade__name">{option.name}</p>
                    <p className="upgrade__network">{t('paymentOptions.network', { network: option.network })}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="upgrade__footer">
        <button
          type="button"
          className="upgrade__back-button"
          onClick={() => onBack && onBack()}
        >
          {t('paymentOptions.back')}
          <img src={backIcon} alt="back" width={29} height={21} />
        </button>
      </div>
    </section>
  )
}
