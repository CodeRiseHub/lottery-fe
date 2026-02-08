import { useEffect } from 'react'
import { t } from '../i18n'

// Crypto payout options (pid, name, minUsd). Matches reference: TRX, BNB, TON, Litecoin.
const PAYOUT_CRYPTO_OPTIONS = [
  { pid: 90, name: 'TRX', minUsd: '0.02' },
  { pid: 130, name: 'BNB', minUsd: '0.02' },
  { pid: 235, name: 'TON', minUsd: '0.02' },
  { pid: 30, name: 'Litecoin', minUsd: '0.05' }
]

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

export default function PayoutScreen({ onBack, onNavigate }) {
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

  const handleSelectCrypto = (option) => {
    if (onNavigate) {
      onNavigate('starsPayoutConfirmation', { selectedOption: option })
    }
  }

  return (
    <section className="payout">
      <div className="container">
        <h1 className="title">{t('payout.title')}</h1>

        <div className="upgrade__currencies">
          <div className="upgrade__list">
            {PAYOUT_CRYPTO_OPTIONS.map((option) => (
              <button
                key={option.pid}
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
                  <p className="upgrade__network">{t('payout.minUsd', { amount: option.minUsd })}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
