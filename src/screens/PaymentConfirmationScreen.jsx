import { useState, useCallback } from 'react'
import { t } from '../i18n'
import backIcon from '../assets/images/back.png'

const COPIED_DURATION_MS = 1000

const FALLBACK_MIN_DEPOSIT = 2

export default function PaymentConfirmationScreen({
  onBack,
  selectedOption,
  amountToSend,
  walletAddress,
  minDeposit
}) {
  const [copyAmountState, setCopyAmountState] = useState('idle') // 'idle' | 'copied'
  const [copyWalletState, setCopyWalletState] = useState('idle')

  const cryptoName = selectedOption?.name ?? ''
  const amount = amountToSend ?? '0'
  const wallet = walletAddress ?? ''

  const copyToClipboard = useCallback((text, setState) => {
    if (text == null || text === '') return
    const ok = navigator.clipboard?.writeText(text)
    if (ok) {
      setState('copied')
      setTimeout(() => setState('idle'), COPIED_DURATION_MS)
    }
  }, [])

  const handleCopyAmount = () => {
    copyToClipboard(amount, setCopyAmountState)
  }

  const handleCopyWallet = () => {
    copyToClipboard(wallet, setCopyWalletState)
  }

  return (
    <section className="upgrade upgrade-pay payment-confirmation">
      <div className="upgrade__container container">
        <h1 className="upgrade__title title">
          {t('paymentConfirmation.sendCrypto', { crypto: cryptoName })}
        </h1>

        <div className="upgrade-pay__info">
          <div className="upgrade-pay__block upgrade-pay__block--top">
            <p className="upgrade-pay__label">{t('paymentConfirmation.pleaseSendAmount')}</p>
            <p className="upgrade-pay__value" id="copyAmount">
              {amount}
            </p>
            <button
              type="button"
              className="upgrade-pay__copy-button"
              onClick={handleCopyAmount}
            >
              <span>
                {copyAmountState === 'copied'
                  ? t('paymentConfirmation.copied')
                  : t('paymentConfirmation.copyAmount')}
              </span>
            </button>
          </div>

          <div className="upgrade-pay__block">
            <p className="upgrade-pay__label">{t('paymentConfirmation.toThisWallet')}</p>
            <p className="upgrade-pay__value upgrade-pay__value--wallet" id="copyWallet">
              {wallet}
            </p>
            <button
              type="button"
              className="upgrade-pay__copy-button"
              onClick={handleCopyWallet}
            >
              <span>
                {copyWalletState === 'copied'
                  ? t('paymentConfirmation.copied')
                  : t('paymentConfirmation.copyWallet')}
              </span>
            </button>
          </div>
        </div>

        <p className="upgrade-pay__text">
          <span>{t('paymentConfirmation.ticketsCredited')}</span>
        </p>

        <p className="upgrade-pay__note">
          {t('paymentConfirmation.note', {
            amount: minDeposit != null ? `$${Number(minDeposit).toFixed(2)}` : `$${FALLBACK_MIN_DEPOSIT.toFixed(2)}`
          })}
        </p>
      </div>

      <div className="upgrade__footer">
        <button
          type="button"
          className="upgrade__back-button"
          onClick={() => onBack && onBack()}
        >
          {t('paymentConfirmation.back')}
          <img src={backIcon} alt="back" width={29} height={21} />
        </button>
      </div>
    </section>
  )
}
