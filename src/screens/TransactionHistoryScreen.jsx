import { useEffect, useState } from 'react'
import { fetchTransactions } from '../api'
import pagLeftIcon from '../assets/images/tasks/pag-left.png'
import pagRightIcon from '../assets/images/tasks/pag-right.png'

export default function TransactionHistoryScreen({ onBack }) {
  const [transactions, setTransactions] = useState([])
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
    const loadTransactions = async () => {
      try {
        setLoading(true)
        const response = await fetchTransactions(currentPage)
        setTransactions(response.content || [])
        setCurrentPage(response.number || 0)
        setTotalPages(response.totalPages || 0)
      } catch (error) {
        console.error('Failed to load transactions:', error)
        setTransactions([])
        setCurrentPage(0)
        setTotalPages(0)
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [currentPage])

  // Format amount from bigint to display format
  const formatAmount = (amount) => {
    if (!amount) return '0'
    const tickets = amount / 1_000_000
    const sign = amount >= 0 ? '+' : ''
    return `${sign} ${tickets.toFixed(2)}`
  }

  // Format transaction type with taskID or roundID
  const formatType = (transaction) => {
    let typeText = transaction.type
    if (transaction.type === 'Task bonus' && transaction.taskId) {
      typeText = `${transaction.type} (TaskID: ${transaction.taskId})`
    } else if ((transaction.type === 'Win' || transaction.type === 'Bet') && transaction.roundId) {
      typeText = `${transaction.type} (RoundID: ${transaction.roundId})`
    }
    return typeText
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
        <h1 className="transaction__title title">Transaction history (30 days)</h1>

        <div className="transaction__table">
          <div className="transaction__head">
            <p className="transaction__head-col">Amount</p>
            <p className="transaction__head-col">Date</p>
          </div>
          
          {loading && currentPage === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>No transactions found</div>
          ) : (
            transactions.map((transaction, index) => (
              <div key={`${transaction.date}-${index}`} className="transaction__row">
                <div className="transaction__main">
                  <p className="transaction__amount" style={{ 
                    color: transaction.amount >= 0 ? '#4caf50' : '#f44336' 
                  }}>
                    {formatAmount(transaction.amount)}
                  </p>
                  <p className="transaction__date">{transaction.date}</p>
                </div>
                <p className="transaction__type">
                  <span>Type: {formatType(transaction)}</span>
                </p>
              </div>
            ))
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

