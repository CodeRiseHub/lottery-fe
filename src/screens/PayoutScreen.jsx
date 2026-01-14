import { useEffect } from 'react'
import tonIcon from '../assets/images/upgrade/ton.png'

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

  return (
    <section className="payout">
      <div className="container">
        <h1 className="title">Payout</h1>

        <div className="upgrade__currencies">
          <div className="upgrade__list">
            <a
              href="#"
              className="upgrade__item"
              onClick={(e) => {
                e.preventDefault()
                if (onNavigate) {
                  onNavigate('payoutConfirmation')
                }
              }}
            >
              <img
                src={tonIcon}
                width="61"
                height="60"
                className="upgrade__icon"
                alt="TON"
              />
              <div className="upgrade__info">
                <p className="upgrade__name">TON</p>
                <p className="upgrade__network">Min. 0.37 USD</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

