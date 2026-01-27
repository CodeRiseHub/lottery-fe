import { useEffect, useState } from 'react'
import { fetchGameHistory } from '../api'
import backIcon from '../assets/images/back.png'
import pagLeftIcon from '../assets/images/tasks/pag-left.png'
import pagRightIcon from '../assets/images/tasks/pag-right.png'

export default function GameHistoryScreen({ onBack, roomNumber }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

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
        const response = await fetchGameHistory(currentPage)
        setHistory(response.content || [])
        setCurrentPage(response.number || 0)
        setTotalPages(response.totalPages || 0)
      } catch (error) {
        console.error('Failed to load game history:', error)
        setHistory([])
        setCurrentPage(0)
        setTotalPages(0)
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [currentPage])

  // Format amount from bigint to display format (divide by 1,000,000 and format to 4 decimals)
  const formatAmount = (amountBigint) => {
    if (!amountBigint) return '0.0000'
    const amount = amountBigint / 1_000_000
    const formatted = Math.abs(amount).toFixed(4)
    return amount >= 0 ? `+${formatted}` : `-${formatted}`
  }

  const showPagination = totalPages > 1

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  return (
    <section className="transaction">
      <div className="transaction__container container">
        <h1 className="transaction__title title">Win history (30 days)</h1>
        
        <a href="#" onClick={(e) => { e.preventDefault(); onBack(roomNumber); }} className="spin__back">
          &lt;&lt;&lt; Back
        </a>
        
        <div className="transaction__table">
          <div className="transaction__head">
            <p className="transaction__head-col">AMOUNT</p>
            <p className="transaction__head-col">DATE</p>
          </div>
          
          {loading && currentPage === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
          ) : history.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>No win history found</div>
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

        {showPagination && (
          <div className="earn__pagination">
            <button
              className="earn__pagination-button"
              onClick={handlePreviousPage}
              disabled={currentPage === 0 || loading}
            >
              <img className="pagination__icon" src={pagLeftIcon} alt="prev" />
            </button>
            <p className="earn__pagination-info">Page {currentPage + 1} of {totalPages}</p>
            <button
              className="earn__pagination-button"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages - 1 || loading}
            >
              <img className="pagination__icon" src={pagRightIcon} alt="Next" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

