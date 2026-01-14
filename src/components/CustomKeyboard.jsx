import { useState, useEffect } from 'react'

export default function CustomKeyboard({ value, onChange, onConfirm, onClose }) {
  const [inputValue, setInputValue] = useState(value && !isNaN(value) ? value.toString() : '0')

  useEffect(() => {
    // Update input value when value prop changes
    if (value && !isNaN(value)) {
      setInputValue(value.toString())
    }
  }, [value])

  const handleNumberClick = (num) => {
    const newValue = inputValue === '0' ? num.toString() : inputValue + num
    setInputValue(newValue)
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
        <p className="modal__keyboard-title">Ticket amount</p>
        
        <div className="modal__keyboard-input-container">
          <input
            type="text"
            className="modal__keyboard-input"
            value={inputValue}
            readOnly
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

