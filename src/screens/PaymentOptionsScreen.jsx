import { useState, useEffect } from 'react'
import { t } from '../i18n'
import backIcon from '../assets/images/back.png'
import { fetchDepositMethods } from '../api'

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

  const handleSelectCrypto = (option) => {
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
    const amountToSend = usdAmount != null ? String(usdAmount) : '0'
    const walletAddress = 'UQCZUOMISQQ1sna0384IHWZInOBgxiBffeNnRMksbPPDOheY'
    if (onNavigate) {
      onNavigate('paymentConfirmation', {
        selectedOption: option,
        amountToSend,
        walletAddress,
        usdAmount,
        ticketsAmount
      })
    }
  }

  return (
    <section className="upgrade payment-options">
      <div className="upgrade__container container">
        <h1 className="upgrade__title title">{t('store.ticketsStore')}</h1>

        <div className="upgrade__currencies payment-options__list-wrap">
          {loading ? (
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
