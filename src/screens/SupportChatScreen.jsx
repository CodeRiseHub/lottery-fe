import { useState, useEffect, useRef } from 'react'
import closeIcon from '../assets/images/close.png'
import backIcon from '../assets/images/back.png'
import arrowUpIcon from '../assets/images/arrow-up.png'
import './SupportChatScreen.css'

export default function SupportChatScreen({ ticketId, ticketSubject, onBack }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'supporter',
      name: 'Supporter',
      text: 'Please wait! Support will answer soon.'
    },
    {
      id: 2,
      sender: 'user',
      name: 'You',
      text: ticketSubject || 'Initial message'
    }
  ])
  const [newMessage, setNewMessage] = useState('')
  const [isClosed, setIsClosed] = useState(false)
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
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    if (scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleSendMessage = () => {
    const message = newMessage.trim()

    if (message.length < 3) {
      alert('Message must be at least 3 characters.')
      return
    }

    if (isClosed) {
      alert('This ticket is closed.')
      return
    }

    // Add user message
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      name: 'You',
      text: message
    }

    setMessages(prev => [...prev, userMessage])
    setNewMessage('')

    // TODO: Implement API call to send message
    // For now, simulate a response after a delay
    setTimeout(() => {
      const supporterMessage = {
        id: Date.now() + 1,
        sender: 'supporter',
        name: 'Supporter',
        text: 'Thank you for your message. We will respond shortly.'
      }
      setMessages(prev => [...prev, supporterMessage])
    }, 1000)
  }

  const handleCloseTicket = () => {
    if (isClosed) return

    const resp = confirm('Are you sure you want to close the ticket?')

    if (!resp) return

    // TODO: Implement API call to close ticket
    setIsClosed(true)
    alert('Ticket closed successfully.')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <section className="support-chat">
      <div className="support-chat__container container">
        <h1 className="support-chat__title title">{ticketSubject || 'Support Ticket'}</h1>

        <div className="support-chat__dialog" id="message-frame">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`support-chat__message support-chat__message--${message.sender}`}
            >
              <p className="support-chat__name">{message.name}</p>
              <p className="support-chat__text">
                <span>{message.text}</span>
              </p>
            </div>
          ))}
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
              />
              
              <button
                className="support-chat__send"
                id="sendNewMessage"
                onClick={handleSendMessage}
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

