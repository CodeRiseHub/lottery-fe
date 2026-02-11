import backIcon from '../assets/images/back.png'
import { t } from '../i18n'

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
            <div className="transaction__title-wrap" style={{ textAlign: 'center' }}>
              <h1 className="transaction__title title">{t('winHistory.title')}</h1>
              <p className="transaction__title-period" style={{ marginTop: '4px', fontSize: '0.85em', opacity: 0.9 }}>{t('winHistory.period')}</p>
            </div>
            
            <button onClick={onClose} className="spin__back" style={{ textAlign: 'right', display: 'block', marginBottom: '20px' }}>
              &lt;&lt;&lt; {t('common.back')}
            </button>
            
            <div className="transaction__table">
              <div className="transaction__head">
                <p className="transaction__head-col">{t('winHistory.amount')}</p>
                <p className="transaction__head-col">{t('winHistory.date')}</p>
              </div>
              {/* History items will be populated here */}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

