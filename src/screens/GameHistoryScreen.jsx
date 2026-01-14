import { useEffect } from 'react'
import backIcon from '../assets/images/back.png'
import './GameHistoryScreen.css'

export default function GameHistoryScreen({ onBack }) {
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
    <section className="transaction">
      <div className="transaction__container container">
        <h1 className="transaction__title title">Game history (last 100)</h1>
        
        <button onClick={onBack} className="spin__back">
          &lt;&lt;&lt; Back
        </button>
        
        <div className="transaction__table">
          <div className="transaction__head">
            <p className="transaction__head-col">AMOUNT</p>
            <p className="transaction__head-col">DATE</p>
          </div>
          {/* History items will be populated here when backend is integrated */}
        </div>
      </div>
    </section>
  )
}

