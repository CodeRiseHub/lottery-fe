import backIcon from '../assets/images/back.png'

export default function GameHistoryModal({ onClose }) {
  return (
    <div
      className="layout active"
      data-modal="gameHistoryModal"
      onClick={(e) => {
        if (e.target.classList.contains('layout')) {
          onClose()
        }
      }}
    >
      <div className="modal modal--game-history" onClick={(e) => e.stopPropagation()}>
        <section className="transaction">
          <div className="transaction__container container">
            <h1 className="transaction__title title">Game history (last 100)</h1>
            
            <button onClick={onClose} className="spin__back" style={{ textAlign: 'right', display: 'block', marginBottom: '20px' }}>
              &lt;&lt;&lt; Back
            </button>
            
            <div className="transaction__table">
              <div className="transaction__head">
                <p className="transaction__head-col">AMOUNT</p>
                <p className="transaction__head-col">DATE</p>
              </div>
              {/* History items will be populated here */}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

