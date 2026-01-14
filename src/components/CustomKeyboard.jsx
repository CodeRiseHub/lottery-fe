import { useState } from 'react'

export default function CustomKeyboard({ value, onChange, onConfirm, onClose }) {
  const [inputValue, setInputValue] = useState(value.toString())

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
    const numValue = parseFloat(inputValue) || 0
    onChange(numValue)
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
          <button className="modal__keyboard-btn modal__keyboard-btn--backspace" onClick={handleBackspace}>✕</button>
        </div>

        <button className="modal__keyboard-ok" onClick={handleConfirm}>
          OK
        </button>
      </div>
    </div>
  )
}

