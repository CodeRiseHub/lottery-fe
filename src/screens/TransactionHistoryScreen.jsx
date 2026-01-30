import { useEffect, useState } from 'react'
import { fetchTransactions } from '../api'
import { t } from '../i18n'
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
    // Map transaction types to localization keys
    const typeMap = {
      'TASK_BONUS': 'transactionHistory.type.taskBonus',
      'DAILY_BONUS': 'transactionHistory.type.dailyBonus',
      'WIN': 'transactionHistory.type.win',
      'BET': 'transactionHistory.type.bet',
      'LOSS': 'transactionHistory.type.bet', // Legacy: Map old LOSS to "Bet"
      'WITHDRAWAL': 'transactionHistory.type.withdrawal',
      'DEPOSIT': 'transactionHistory.type.deposit'
    }
    
    // Handle legacy format (Task bonus, Daily bonus, Win, Bet) and new format (TASK_BONUS, DAILY_BONUS, WIN, BET, LOSS, WITHDRAWAL, DEPOSIT)
    const normalizedType = transaction.type.toUpperCase().replace(' ', '_')
    const localizationKey = typeMap[normalizedType] || typeMap[transaction.type] || null
    
    if (localizationKey) {
      typeText = t(localizationKey)
    }
    
    // Add taskID or roundID if available
    // Don't add taskId for DAILY_BONUS (it should be null, but check to be safe)
    if ((normalizedType === 'TASK_BONUS' || transaction.type === 'Task bonus') && transaction.taskId) {
      typeText = `${typeText} (${t('transactionHistory.taskId')}: ${transaction.taskId})`
    } else if ((normalizedType === 'WIN' || normalizedType === 'BET' || normalizedType === 'LOSS' || transaction.type === 'Win' || transaction.type === 'Bet' || transaction.type === 'Loss') && transaction.roundId) {
      typeText = `${typeText} (${t('transactionHistory.roundId')}: ${transaction.roundId})`
    }
    // DAILY_BONUS doesn't show taskId (intentionally excluded)
    
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
        <h1 className="transaction__title title">{t('transactionHistory.title')}</h1>

        <div className="transaction__table">
          <div className="transaction__head">
            <p className="transaction__head-col">{t('transactionHistory.amount')}</p>
            <p className="transaction__head-col">{t('transactionHistory.date')}</p>
          </div>
          
          {loading && currentPage === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>{t('transactionHistory.loading')}</div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>{t('transactionHistory.noData')}</div>
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
                  <span>{t('transactionHistory.type', { type: formatType(transaction) })}</span>
                </p>
              </div>
            ))
          )}
        </div>
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
          <p className="earn__pagination-info">{t('transactionHistory.pagination', { current: currentPage + 1, total: totalPages })}</p>
          <button
            className="earn__pagination-button"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages - 1 || loading}
          >
            <img className="pagination__icon" src={pagRightIcon} alt="Next" />
          </button>
        </div>
      )}
    </section>
  )
}

