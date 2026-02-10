import { t } from '../i18n'

export default function PaymentErrorScreen({ onBack, minDepositForNetwork, usdAmount, ticketsAmount }) {
  const minDisplay = minDepositForNetwork != null ? Number(minDepositForNetwork) : 30
  const minDisplayFormatted = `$${minDisplay}`
  const handleChangeMethod = () => {
    if (onBack) onBack()
  }

  return (
    <section className="upgrade upgrade-pay">
      <div className="container">
        <h1 className="title" style={{ color: 'var(--color-text, #fff)' }}>ERROR</h1>
        <center>
          <p className="upgrade__label" style={{ color: 'var(--color-text, #fff)', marginTop: '1rem' }}>
            {t('paymentError.minForNetwork', { amount: minDisplayFormatted })}
          </p>
          <br />
          <button
            type="button"
            className="top-up__change-method"
            onClick={handleChangeMethod}
            style={{
              background: 'none',
              border: 'none',
              color: '#2aa3ff',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              padding: '0.25rem 0'
            }}
          >
            {t('paymentError.changePaymentMethod')}
          </button>
        </center>
      </div>
    </section>
  )
}
