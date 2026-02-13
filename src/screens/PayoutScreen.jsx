import { useEffect, useState } from 'react'
import { t } from '../i18n'
import { fetchWithdrawalMethods } from '../api'

const cryptoIconModules = import.meta.glob('../assets/crypto_new/*.png', { eager: true, query: '?url', import: 'default' })
const cryptoIconMap = {}
Object.keys(cryptoIconModules).forEach((path) => {
  const match = path.match(/(\d+)\.png$/)
  if (match) cryptoIconMap[match[1]] = cryptoIconModules[path]
})
// Icon filename is from API iconId (e.g. 30.png, 130.png), not pid (1.png, 2.png).
function getCryptoIconUrl(iconId) {
  const key = iconId != null ? String(iconId) : ''
  const url = key ? cryptoIconMap[key] : null
  return url != null ? url : `/assets/crypto_new/${key || '0'}.png`
}

export default function PayoutScreen({ onBack, onNavigate, userData }) {
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchWithdrawalMethods()
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data?.methods) ? data.methods : []
        setMethods(list.map((m) => ({
          pid: m.pid,
          name: m.name,
          minUsd: m.minWithdrawal != null ? String(m.minWithdrawal) : '0.10',
          network: m.network,
          iconId: m.iconId != null ? String(m.iconId) : ''
        })))
      })
      .catch(() => {
        if (!cancelled) setMethods([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
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

  const handleSelectCrypto = (option) => {
    if (userData?.payoutEnabled === false) {
      alert(t('feature.payoutsUnavailable'))
      return
    }
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
            {loading ? (
              <p className="upgrade__label" style={{ textAlign: 'center', padding: '1rem' }}>{t('common.loading')}</p>
            ) : methods.length === 0 ? (
              <p className="upgrade__label" style={{ textAlign: 'center', padding: '1rem' }}>{t('payout.noMethods')}</p>
            ) : (
            methods.map((option) => (
              <button
                key={option.pid}
                type="button"
                className="upgrade__item"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%', padding: 0, font: 'inherit' }}
                onClick={() => handleSelectCrypto(option)}
              >
                <img
                  src={getCryptoIconUrl(option.iconId != null ? option.iconId : '')}
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
            ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
