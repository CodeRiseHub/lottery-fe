import { useState, useEffect, useRef } from 'react'

export default function CustomKeyboard({ value, onChange, onConfirm, onClose }) {
  const [inputValue, setInputValue] = useState(value && !isNaN(value) ? value.toString() : '0')
  const [hasStartedTyping, setHasStartedTyping] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    // Update input value when value prop changes (only if user hasn't started typing)
    if (!hasStartedTyping && value && !isNaN(value)) {
      setInputValue(value.toString())
    }
  }, [value, hasStartedTyping])

  // Focus input when keyboard opens
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleNumberClick = (num) => {
    if (!hasStartedTyping) {
      // Clear existing value when user starts typing
      setInputValue(num.toString())
      setHasStartedTyping(true)
    } else {
      // Append to current value
      const newValue = inputValue === '0' ? num.toString() : inputValue + num
      setInputValue(newValue)
    }
  }

  const handleKeyDown = (e) => {
    // Handle real keyboard input
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      handleNumberClick(e.key)
    } else if (e.key === '.') {
      e.preventDefault()
      handleDecimalClick()
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      handleBackspace()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  const handleDecimalClick = () => {
    if (!inputValue.includes('.')) {
      setInputValue(inputValue + '.')
    }
  }

  const handleBackspace = () => {
    if (inputValue.length > 1) {
      setInputValue(inputValue.slice(0, -1))
    } else {
      setInputValue('0')
    }
  }

  const handleConfirm = () => {
    const numValue = parseFloat(inputValue)
    if (!isNaN(numValue) && numValue > 0) {
      onChange(numValue)
    }
    // Always call onConfirm to close the modal
    onConfirm()
  }

  return (
    <div
      className="layout active"
      data-modal="customKeyboard"
      onClick={(e) => {
        if (e.target.classList.contains('layout')) {
          onClose()
        }
      }}
    >
      <div className="modal modal--keyboard" onClick={(e) => e.stopPropagation()}>
        <p className="modal__keyboard-title">Enter amount</p>
        
        <div className="modal__keyboard-input-container">
          <input
            ref={inputRef}
            type="text"
            className="modal__keyboard-input"
            value={inputValue}
            onChange={(e) => {
              // Allow direct input from keyboard
              const newValue = e.target.value
              if (/^\d*\.?\d*$/.test(newValue) || newValue === '') {
                if (!hasStartedTyping && newValue !== '') {
                  setHasStartedTyping(true)
                }
                setInputValue(newValue || '0')
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              // When input is focused, mark as started typing if it has a value
              if (inputValue && inputValue !== '0') {
                setHasStartedTyping(true)
              }
            }}
          />
        </div>

        <div className="modal__keyboard-grid">
          <button className="modal__keyboard-btn" onClick={() => handleNumberClick('1')}>1</button>
          <button className="modal__keyboard-btn" onClick={() => handleNumberClick('2')}>2</button>
          <button className="modal__keyboard-btn" onClick={() => handleNumberClick('3')}>3</button>
          <button className="modal__keyboard-btn" onClick={() => handleNumberClick('4')}>4</button>
          <button className="modal__keyboard-btn" onClick={() => handleNumberClick('5')}>5</button>
          <button className="modal__keyboard-btn" onClick={() => handleNumberClick('6')}>6</button>
          <button className="modal__keyboard-btn" onClick={() => handleNumberClick('7')}>7</button>
          <button className="modal__keyboard-btn" onClick={() => handleNumberClick('8')}>8</button>
          <button className="modal__keyboard-btn" onClick={() => handleNumberClick('9')}>9</button>
          <button className="modal__keyboard-btn" onClick={handleDecimalClick}>.</button>
          <button className="modal__keyboard-btn" onClick={() => handleNumberClick('0')}>0</button>
          <button className="modal__keyboard-btn modal__keyboard-btn--backspace" onClick={handleBackspace}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 11H6.83L10.41 7.41L9 6L3 12L9 18L10.41 16.59L6.83 13H21V11Z" fill="white"/>
            </svg>
          </button>
        </div>

        <button className="modal__keyboard-ok" onClick={handleConfirm}>
          OK
        </button>
      </div>
    </div>
  )
}

