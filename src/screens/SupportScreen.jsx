import { useState, useEffect } from 'react'
import './SupportScreen.css'

export default function SupportScreen({ onBack }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const minSubjectLength = 5
    const minMessageLength = 3

    if (subject.trim().length < minSubjectLength) {
      setError('Subject must be at least 5 characters.')
      return
    }

    if (message.trim().length < minMessageLength) {
      setError('Message must be at least 3 characters.')
      return
    }

    // TODO: Implement API call to submit support request
    console.log('Submitting support request:', { subject, message })
    // For now, just show success message
    alert('Support request submitted successfully!')
    setSubject('')
    setMessage('')
  }

  return (
    <section className="support">
      <div className="support__container container">
        <h1 className="support__title title">Support</h1>
        
        <p className="support__subtitle">Ask your question below</p>
        {error && (
          <p className="support__subtitle" style={{ color: 'red' }}>
            {error}
          </p>
        )}
        
        <div className="support__form">
          <div className="support__field">
            <p className="support__label">Subject</p>
            <textarea
              className="support__textarea"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="support__field">
            <p className="support__label">Message</p>
            <textarea
              className="support__textarea"
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <button className="support__submit-button" id="send" onClick={handleSubmit}>
            <span>SUBMIT REQUEST</span>
          </button>
        </div>
      </div>
    </section>
  )
}

