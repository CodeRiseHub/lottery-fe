import { useState, useRef, useEffect } from 'react'
import { t } from '../i18n'

export default function RoomDropdown({ currentRoom, rooms, onRoomChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Close dropdown when currentRoom changes (room was successfully changed)
  useEffect(() => {
    setIsOpen(false)
  }, [currentRoom.number])

  const handleRoomSelect = (room) => {
    // Close dropdown immediately
    setIsOpen(false)
    // Then trigger room change
    onRoomChange(room)
  }

  return (
    <div className="room-dropdown" ref={dropdownRef}>
      <button
        className="room-dropdown__button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="room-dropdown__text">{t('game.room')} {currentRoom.number}</span>
        <span className="room-dropdown__spacer"></span>
        <span className="room-dropdown__users">
          {currentRoom.users} 👤
        </span>
        <span className="room-dropdown__arrow">{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <div className="room-dropdown__menu">
          {rooms.map((room) => (
            <button
              key={room.number}
              className={`room-dropdown__item ${room.number === currentRoom.number ? 'active' : ''}`}
              onClick={() => handleRoomSelect(room)}
            >
              <span className="room-dropdown__item-text">{t('game.room')} {room.number}</span>
              <span className="room-dropdown__item-users">{room.users} 👤</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

