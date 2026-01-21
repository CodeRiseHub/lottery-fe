import { useEffect, useState } from 'react'
import { fetchGameHistory } from '../api'
import backIcon from '../assets/images/back.png'

export default function GameHistoryScreen({ onBack, roomNumber }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

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
    const loadHistory = async () => {
      setLoading(true)
      try {
        const data = await fetchGameHistory()
        setHistory(data || [])
      } catch (error) {
        console.error('Failed to load game history:', error)
        setHistory([])
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [])

  // Format amount from bigint to display format (divide by 1,000,000 and format to 4 decimals)
  const formatAmount = (amountBigint) => {
    if (!amountBigint) return '0.0000'
    const amount = amountBigint / 1_000_000
    const formatted = Math.abs(amount).toFixed(4)
    return amount >= 0 ? `+${formatted}` : `-${formatted}`
  }

  return (
    <section className="transaction">
      <div className="transaction__container container">
        <h1 className="transaction__title title">Game history (last 100)</h1>
        
        <a href="#" onClick={(e) => { e.preventDefault(); onBack(roomNumber); }} className="spin__back">
          &lt;&lt;&lt; Back
        </a>
        
        <div className="transaction__table">
          <div className="transaction__head">
            <p className="transaction__head-col">AMOUNT</p>
            <p className="transaction__head-col">DATE</p>
          </div>
          
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
          ) : history.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>No game history found</div>
          ) : (
            history.map((entry, index) => {
              const isPositive = entry.amount >= 0
              const amountText = formatAmount(entry.amount)
              
              return (
                <div key={index} className="transaction__row">
                  <div className="transaction__main">
                    <p 
                      className="transaction__amount"
                      style={{ color: isPositive ? '#28a745' : '#dc3545' }}
                    >
                      {amountText}
                    </p>
                    <p className="transaction__date">{entry.date}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}

