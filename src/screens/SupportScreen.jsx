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
      
      // Reload ticket history
      await loadTicketHistory()
      
      // Navigate to support chat screen
      if (onNavigate) {
        onNavigate('supportChat', { ticketId: ticket.id, ticketSubject: ticket.subject })
      }
    } catch (error) {
      console.error('Failed to create ticket:', error)
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

  const formatDate = (dateString) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch (e) {
      return dateString
    }
  }

  const getStatusBadge = (status) => {
    return status === 'OPENED' ? 'Open' : 'Closed'
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
              placeholder={`Enter subject (${MIN_SUBJECT_LENGTH}-${MAX_SUBJECT_LENGTH} characters)`}
            />
            <p className="support__char-count">
              {subject.length}/{MAX_SUBJECT_LENGTH} characters
            </p>
          </div>

          <div className="support__field">
            <p className="support__label">Message</p>
            <textarea
              className="support__textarea"
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder={`Enter message (${MIN_MESSAGE_LENGTH}-${MAX_MESSAGE_LENGTH} characters)`}
            />
            <p className="support__char-count">
              {message.length}/{MAX_MESSAGE_LENGTH} characters
            </p>
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

        {/* Ticket History */}
        <div className="support__history">
          <h2 className="support__history-title">Request History</h2>
          {loadingTickets ? (
            <p className="support__history-loading">Loading...</p>
          ) : tickets.length === 0 ? (
            <p className="support__history-empty">No tickets yet</p>
          ) : (
            <div className="support__history-table">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <button
                          className="support__history-subject-link"
                          onClick={() => handleTicketClick(ticket)}
                        >
                          {ticket.subject}
                        </button>
                      </td>
                      <td>
                        <span className={`support__history-status support__history-status--${ticket.status.toLowerCase()}`}>
                          {getStatusBadge(ticket.status)}
                        </span>
                      </td>
                      <td>{formatDate(ticket.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
