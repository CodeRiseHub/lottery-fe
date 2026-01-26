import { useState, useEffect } from 'react'
import { createSupportTicket, fetchTicketHistory } from '../api'

export default function SupportScreen({ onBack, onNavigate }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tickets, setTickets] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(true)

  const MIN_SUBJECT_LENGTH = 5
  const MAX_SUBJECT_LENGTH = 100
  const MIN_MESSAGE_LENGTH = 3
  const MAX_MESSAGE_LENGTH = 2000

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
    loadTicketHistory()
  }, [])

  const loadTicketHistory = async () => {
    setLoadingTickets(true)
    try {
      const data = await fetchTicketHistory()
      setTickets(data || [])
    } catch (error) {
      console.error('Failed to load ticket history:', error)
      setTickets([])
    } finally {
      setLoadingTickets(false)
    }
  }

  const validateForm = () => {
    const subjectTrimmed = subject.trim()
    const messageTrimmed = message.trim()

    if (subjectTrimmed.length < MIN_SUBJECT_LENGTH) {
      setError(`Subject must be at least ${MIN_SUBJECT_LENGTH} characters.`)
      return false
    }

    if (subjectTrimmed.length > MAX_SUBJECT_LENGTH) {
      setError(`Subject must not exceed ${MAX_SUBJECT_LENGTH} characters.`)
      return false
    }

    if (messageTrimmed.length < MIN_MESSAGE_LENGTH) {
      setError(`Message must be at least ${MIN_MESSAGE_LENGTH} characters.`)
      return false
    }

    if (messageTrimmed.length > MAX_MESSAGE_LENGTH) {
      setError(`Message must not exceed ${MAX_MESSAGE_LENGTH} characters.`)
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const ticket = await createSupportTicket(subject.trim(), message.trim())
      
      // Clear form
      setSubject('')
      setMessage('')
      
      // Navigate to support chat screen immediately
      // Ticket history will be reloaded when user returns to this screen (via useEffect on mount)
      if (onNavigate) {
        onNavigate('supportChat', { ticketId: ticket.id, ticketSubject: ticket.subject })
      }
    } catch (error) {
      console.error('Failed to create ticket:', error)
      // Extract user-friendly error message
      const errorMessage = error.response?.message || error.message || 'Failed to create ticket. Please try again.'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTicketClick = (ticket) => {
    if (onNavigate) {
      onNavigate('supportChat', { ticketId: ticket.id, ticketSubject: ticket.subject })
    }
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
              maxLength={MAX_SUBJECT_LENGTH}
            />
          </div>

          <div className="support__field">
            <p className="support__label">Message</p>
            <textarea
              className="support__textarea"
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MAX_MESSAGE_LENGTH}
            />
          </div>

          <button 
            className="support__submit-button" 
            id="send" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'SUBMITTING...' : 'SUBMIT REQUEST'}</span>
          </button>
        </div>

        {/* Ticket History - Only show if there are tickets */}
        {!loadingTickets && tickets.length > 0 && (
          <div className="support__history">
            <p className="support__history-title">Your requests:</p>

            <div className="support__history-row support__history-row--head">
              <p className="support__status">Status</p>
              <p className="support__subject">Subject (Click to open)</p>
            </div>

            {tickets.map((ticket) => (
              <div key={ticket.id} className="support__history-row">
                <p className={`support__status ${ticket.status === 'CLOSED' ? 'support__status-closed' : ''}`}>
                  {ticket.status}
                </p>
                <p className="support__subject">
                  <a
                    href="#"
                    className="support__link"
                    onClick={(e) => {
                      e.preventDefault()
                      handleTicketClick(ticket)
                    }}
                  >
                    {ticket.subject}
                  </a>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
