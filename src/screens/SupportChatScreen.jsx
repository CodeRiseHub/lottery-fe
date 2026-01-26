import { useState, useEffect, useRef } from 'react'
import { fetchTicketDetail, addTicketMessage, closeTicket } from '../api'
import closeIcon from '../assets/images/close.png'
import backIcon from '../assets/images/back.png'
import arrowUpIcon from '../assets/images/arrow-up.png'

const MIN_MESSAGE_LENGTH = 3
const MAX_MESSAGE_LENGTH = 2000

export default function SupportChatScreen({ ticketId, ticketSubject, onBack }) {
  const [ticket, setTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isClosed, setIsClosed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const scrollAnchorRef = useRef(null)

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
    if (ticketId) {
      loadTicketDetail()
    }
  }, [ticketId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadTicketDetail = async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await fetchTicketDetail(ticketId)
      setTicket(data)
      setIsClosed(data.status === 'CLOSED')
      
      // Map messages to display format
      const mappedMessages = data.messages.map(msg => ({
        id: msg.id,
        sender: msg.isFromSupport ? 'supporter' : 'user',
        name: msg.isFromSupport ? 'Support' : 'You',
        text: msg.message,
        createdAt: msg.createdAt
      }))
      
      // Always add the hardcoded "Supporter Please wait! Support will answer soon." as first message
      const supporterWaitMessage = {
        id: 'supporter-wait',
        sender: 'supporter',
        name: 'Supporter',
        text: 'Please wait! Support will answer soon.',
        createdAt: null
      }
      
      setMessages([supporterWaitMessage, ...mappedMessages])
    } catch (error) {
      console.error('Failed to load ticket detail:', error)
      const errorMessage = error.response?.message || error.message || 'Failed to load ticket. Please try again.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const scrollToBottom = () => {
    if (scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const validateMessage = () => {
    const messageTrimmed = newMessage.trim()

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

  const handleSendMessage = async () => {
    if (!validateMessage()) {
      return
    }

    if (isClosed) {
      setError('This ticket is closed. You cannot send messages to a closed ticket.')
      return
    }

    setIsSending(true)
    setError('')
    
    try {
      const messageData = await addTicketMessage(ticketId, newMessage.trim())
      
      // Add new message to list
      const newMsg = {
        id: messageData.id,
        sender: messageData.isFromSupport ? 'supporter' : 'user',
        name: messageData.isFromSupport ? 'Support' : 'You',
        text: messageData.message,
        createdAt: messageData.createdAt
      }
      
      setMessages(prev => {
        // Keep the hardcoded supporter wait message as first, then add new message
        const supporterWaitMessage = prev.find(m => m.id === 'supporter-wait')
        const otherMessages = prev.filter(m => m.id !== 'supporter-wait')
        return supporterWaitMessage ? [supporterWaitMessage, ...otherMessages, newMsg] : [...prev, newMsg]
      })
      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
      // Extract user-friendly error message from backend
      const errorMessage = error.response?.message || error.message || 'Failed to send message. Please try again.'
      setError(errorMessage)
    } finally {
      setIsSending(false)
    }
  }

  const handleCloseTicket = async () => {
    if (isClosed) return

    const resp = confirm('Are you sure you want to close the ticket?')

    if (!resp) return

    try {
      await closeTicket(ticketId)
      setIsClosed(true)
      // Reload ticket to get updated status
      await loadTicketDetail()
    } catch (error) {
      console.error('Failed to close ticket:', error)
      const errorMessage = error.response?.message || error.message || 'Failed to close ticket. Please try again.'
      alert(errorMessage)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const displaySubject = ticket?.subject || ticketSubject || 'Support Ticket'

  if (isLoading) {
    return (
      <section className="support-chat">
        <div className="support-chat__container container">
          <h1 className="support-chat__title title">{displaySubject}</h1>
          <p>Loading...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="support-chat">
      <div className="support-chat__container container">
        <h1 className="support-chat__title title">{displaySubject}</h1>

        {error && (
          <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>
        )}

        <div className="support-chat__dialog" id="message-frame">
          {messages.length === 0 ? (
            <p>No messages yet.</p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`support-chat__message support-chat__message--${message.sender}`}
              >
                <p className="support-chat__name">{message.name}</p>
                <p className="support-chat__text">
                  <span>{message.text}</span>
                </p>
              </div>
            ))
          )}
        </div>
        <br /><br /><br /><br /><br /><br />
        <div id="scroll-anchor" ref={scrollAnchorRef}></div>
        <div className="support-chat__footer">
          <div className="support-chat__controls">
            <button
              className="support-chat__close"
              id="closeTicket"
              onClick={handleCloseTicket}
              disabled={isClosed}
            >
              {isClosed ? 'IS CLOSED' : 'Close ticket'}
              <img
                src={closeIcon}
                alt="close"
                width="21"
                height="21"
              />
            </button>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                if (onBack) onBack()
              }}
              className="support-chat__back"
            >
              Go back
              <img
                src={backIcon}
                alt="back"
                width="29"
                height="21"
              />
            </a>
          </div>

          {!isClosed && (
            <div className="support-chat__input-wrapper" id="inputT">
              <textarea
                type="text"
                className="support-chat__input"
                placeholder="Type something..."
                id="newMessageText"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                maxLength={MAX_MESSAGE_LENGTH}
                disabled={isSending}
              />
              
              <button
                className="support-chat__send"
                id="sendNewMessage"
                onClick={handleSendMessage}
                disabled={isSending || newMessage.trim().length < MIN_MESSAGE_LENGTH}
              >
                <img
                  src={arrowUpIcon}
                  alt="send"
                  width="15"
                  height="26"
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
