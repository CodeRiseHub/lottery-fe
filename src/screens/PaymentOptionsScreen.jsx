import { t } from '../i18n'
import backIcon from '../assets/images/back.png'

// Static list of crypto options for deposit (pid, name, network). Later: fetch from API.
const CRYPTO_OPTIONS = [
  { pid: 235, name: 'TON', network: 'TON' },
  { pid: 90, name: 'TRON', network: 'TRC20' },
  { pid: 10, name: 'Bitcoin', network: 'BTC' },
  { pid: 100, name: 'USDC', network: 'ERC20' },
  { pid: 20, name: 'Ethereum', network: 'ERC20' },
  { pid: 71, name: 'USDT', network: 'TRC20' },
  { pid: 30, name: 'LiteCoin', network: 'LTC' },
  { pid: 130, name: 'BNB', network: 'BEP20' },
  { pid: 244, name: 'NOT', network: 'TON' },
  { pid: 245, name: 'DOGS', network: 'TON' },
  { pid: 206, name: 'Shiba Inu', network: 'BEP20' },
  { pid: 40, name: 'DOGE', network: 'DOGE' },
  { pid: 60, name: 'Solana', network: 'SOL' },
  { pid: 120, name: 'XRP', network: 'XRP' },
  { pid: 73, name: 'USDT', network: 'SOL' },
  { pid: 50, name: 'BCH', network: 'BCH' },
  { pid: 70, name: 'USDT', network: 'ERC20' },
  { pid: 72, name: 'USDT', network: 'BEP20' },
  { pid: 75, name: 'USDT', network: 'TON' },
  { pid: 76, name: 'USDT', network: 'ARBITRUM' },
  { pid: 201, name: 'Bitcoin', network: 'BEP20' },
  { pid: 74, name: 'USDT', network: 'MATIC' },
  { pid: 77, name: 'USDT', network: 'OPTIMISM' },
  { pid: 78, name: 'USDT', network: 'Avalanche' },
  { pid: 102, name: 'USDC', network: 'MATIC' },
  { pid: 202, name: 'Ethereum', network: 'BEP20' },
  { pid: 207, name: 'Shiba Inu', network: 'ERC20' },
  { pid: 101, name: 'USDC', network: 'BEP20' },
  { pid: 64, name: 'AVAX', network: 'Avalanche' },
  { pid: 61, name: 'MATIC', network: 'MATIC' },
  { pid: 242, name: 'BONK', network: 'SOL' },
  { pid: 240, name: 'FLOKI', network: 'BEP20' },
  { pid: 62, name: 'ARB', network: 'ARBITRUM' },
  { pid: 208, name: 'DASH', network: 'DASH' }
]

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

export default function PaymentOptionsScreen({ onBack, usdAmount, ticketsAmount }) {
  const handleSelectCrypto = (option) => {
    // TODO: when API is ready, create payment for this crypto and redirect to provider
    console.log('Selected crypto:', option, 'usdAmount:', usdAmount, 'ticketsAmount:', ticketsAmount)
  }

  return (
    <section className="upgrade payment-options">
      <div className="upgrade__container container">
        <h1 className="upgrade__title title">{t('store.ticketsStore')}</h1>

        <div className="upgrade__currencies payment-options__list-wrap">
          <div className="upgrade__list">
            {CRYPTO_OPTIONS.map((option) => (
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
      </div>
    </section>
  )
}
