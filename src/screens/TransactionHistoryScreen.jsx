import { useEffect } from 'react'

export default function TransactionHistoryScreen({ onBack }) {
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

  // Dummy data - will be replaced with API data
  const transactions = [
    {
      id: 1,
      amount: '+ 0.0004 USD',
      date: '13.01 at 22:29',
      type: 'Hash exchange to USD'
    }
  ]

  return (
    <section className="transaction">
      <div className="transaction__container container">
        <h1 className="transaction__title title">Transaction history</h1>

        <div className="transaction__table">
          <div className="transaction__head">
            <p className="transaction__head-col">Amount</p>
            <p className="transaction__head-col">Date</p>
          </div>
          
          {transactions.map((transaction) => (
            <div key={transaction.id} className="transaction__row">
              <div className="transaction__main">
                <p className="transaction__amount">{transaction.amount}</p>
                <p className="transaction__date">{transaction.date}</p>
              </div>
              <p className="transaction__type">
                <span>Type: {transaction.type}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

