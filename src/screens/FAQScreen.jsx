import { useEffect } from 'react'

export default function FAQScreen({ onBack }) {
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

  const faqItems = [
    {
      question: 'How does mining work?',
      answer: 'Mining creates new blockchain blocks, ensuring cryptocurrency platforms function. Miners earn rewards in newly issued coins and transaction fees.'
    },
    {
      question: 'How to start?',
      answer: 'Rent cloud power on our platform. More power means faster mining and higher earnings.'
    },
    {
      question: 'How do I exchange hashes for USD?',
      answer: 'Go to the "Miner" section, tap the "SELL HASHES" button, and confirm.'
    },
    {
      question: 'What are Hashes?',
      answer: 'Hashes are cryptographic calculations essential for blockchain operations.'
    },
    {
      question: 'Exchange rate (Hashes to USD)',
      answer: '100 Hashes = 0.01 USD\n10,000 Hashes = 1 USD'
    },
    {
      question: 'Mining stopped — what now?',
      answer: 'Each miner has its own mining duration. Once it ends, just tap "Start Mining" to restart and keep earning.'
    },
    {
      question: 'How long do payouts take?',
      answer: 'Requests are processed immediately via the payment gateway.'
    },
    {
      question: 'Can I reinvest my earnings?',
      answer: 'Yes, you can use your balance in the "Withdrawal" section to boost mining power without withdrawing.'
    },
    {
      question: 'Referral rewards?',
      answer: 'Our 3-tier referral system rewards you for your referrals\' first and future purchases. More details can be found in the "Earn" section.'
    },
    {
      question: 'Need help?',
      answer: 'Contact our support team via the Support page.'
    }
  ]

  return (
    <section className="faq">
      <div className="container">
        <h1 className="title">Mining FAQ</h1>
        <div className="faq__list">
          {faqItems.map((item, index) => (
            <div key={index} className="faq__item">
              <p className="faq__question">{item.question}</p>
              <p className="faq__answer">{item.answer}</p>
            </div>
          ))}
          <div className="faq__actions">
            <a href="#" onClick={(e) => { e.preventDefault(); if (onBack) onBack('support'); }} className="faq__button">
              SUPPORT TEAM
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

