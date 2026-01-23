import { useEffect, useState } from 'react'
import { fetchTransactions } from '../api'

export default function TransactionHistoryScreen({ onBack }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasMore, setHasMore] = useState(false)

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
        setTotalPages(response.totalPages || 0)
        setHasMore(!response.last && response.content && response.content.length > 0)
      } catch (error) {
        console.error('Failed to load transactions:', error)
        setTransactions([])
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
    return `${sign} ${tickets.toFixed(4)}`
  }

  // Format transaction type with taskID or roundID
  const formatType = (transaction) => {
    let typeText = transaction.type
    if (transaction.type === 'Task bonus' && transaction.taskId) {
      typeText = `${transaction.type} (TaskID: ${transaction.taskId})`
    } else if ((transaction.type === 'Win' || transaction.type === 'Loss') && transaction.roundId) {
      typeText = `${transaction.type} (RoundID: ${transaction.roundId})`
    }
    return typeText
  }

  const loadMore = () => {
    if (hasMore && !loading) {
      setCurrentPage(prev => prev + 1)
    }
  }

  return (
    <section className="transaction">
      <div className="transaction__container container">
        <h1 className="transaction__title title">Transaction history</h1>

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
            <>
              {transactions.map((transaction, index) => (
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
              ))}
              
              {hasMore && (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <button 
                    onClick={loadMore} 
                    disabled={loading}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#1e88e5',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

