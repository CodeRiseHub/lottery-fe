import { useState, useRef, useEffect } from 'react'

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

  const handleRoomSelect = (room) => {
    onRoomChange(room)
    setIsOpen(false)
  }

  return (
    <div className="room-dropdown" ref={dropdownRef}>
      <button
        className="room-dropdown__button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="room-dropdown__text">Room {currentRoom.number}</span>
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
              <span className="room-dropdown__item-text">Room {room.number}</span>
              <span className="room-dropdown__item-users">{room.users} 👤</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

