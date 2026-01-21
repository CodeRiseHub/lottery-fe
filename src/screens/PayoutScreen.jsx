import { useEffect } from 'react'
import starIcon from '../assets/purchase/star.png'
import giftIcon from '../assets/purchase/gift.png'

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
                  onNavigate('payoutConfirmation', { type: 'stars' })
                }
              }}
            >
              <img
                src={starIcon}
                width="61"
                height="60"
                className="upgrade__icon"
                alt="Stars"
              />
              <div className="upgrade__info">
                <p className="upgrade__name">Stars</p>
                <p className="upgrade__network">Min. 15 Stars</p>
              </div>
            </a>
            <a
              href="#"
              className="upgrade__item"
              onClick={(e) => {
                e.preventDefault()
                if (onNavigate) {
                  onNavigate('payoutConfirmation', { type: 'gift' })
                }
              }}
            >
              <img
                src={giftIcon}
                width="61"
                height="60"
                className="upgrade__icon"
                alt="Gift"
              />
              <div className="upgrade__info">
                <p className="upgrade__name">Gift</p>
                <p className="upgrade__network">Min. 15 Stars</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

