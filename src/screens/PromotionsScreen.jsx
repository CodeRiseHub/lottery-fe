import { useState, useEffect, useCallback } from 'react'
import { getPromotions } from '../api'
import { t } from '../i18n'
import backIcon from '../assets/images/back.png'

const STATUS_ACTIVE = 'ACTIVE'
const STATUS_FINISHED = 'FINISHED'

function getShortDescription(promo) {
  const type = (promo.type || '').toUpperCase()
  const reward = promo.totalReward != null ? Math.round(Number(promo.totalReward) / 1_000_000) : 0
  const rewardStr = reward.toLocaleString()
  if (type === 'NET_WIN') return t('promo.net_win.short', { reward: rewardStr })
  if (type === 'NET_WIN_MAX_BET') return t('promo.net_win_max_bet.short', { reward: rewardStr })
  if (type === 'REF_COUNT') return t('promo.ref_count.short', { reward: rewardStr })
  return promo.name || String(promo.id)
}

export default function PromotionsScreen({ onBack, onNavigate }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getPromotions()
      setList(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(t('promo.error'))
      setList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const active = list.filter((p) => p.status === STATUS_ACTIVE)
  const finished = list.filter((p) => p.status === STATUS_FINISHED)

  return (
    <section className="faq promotions">
      <div className="container" style={{ marginBottom: '150px' }}>
        <h1 className="title" style={{ textAlign: 'center' }}>{t('promo.title')}</h1>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary, #ccc)' }}>{t('promo.loading')}</p>
        ) : error ? (
          <p style={{ textAlign: 'center', color: 'var(--error, #e74c3c)' }}>{error}</p>
        ) : active.length === 0 && finished.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary, #ccc)' }}>{t('promo.noPromotions')}</p>
        ) : (
          <>
            {active.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary, #fff)', textAlign: 'center' }}>
                  {t('promo.activeHeading')}
                </h2>
                {active.map((p) => (
                  <div key={p.id} className="faq__list" style={{ marginBottom: '8px' }}>
                    <div
                      className="faq__item"
                      style={{ cursor: 'pointer', textAlign: 'center', border: 'none', paddingTop: 0 }}
                      onClick={() => onNavigate && onNavigate('promotionDetail', { promotionId: p.id })}
                      onKeyDown={(e) => e.key === 'Enter' && onNavigate && onNavigate('promotionDetail', { promotionId: p.id })}
                      role="button"
                      tabIndex={0}
                    >
                      <p className="faq__question" style={{ marginBottom: 0, fontWeight: 400 }}>{getShortDescription(p)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {finished.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary, #fff)', textAlign: 'center' }}>
                  {t('promo.finishedHeading')}
                </h2>
                {finished.map((p) => (
                  <div key={p.id} className="faq__list" style={{ marginBottom: '8px' }}>
                    <div
                      className="faq__item"
                      style={{ cursor: 'pointer', textAlign: 'center', border: 'none', paddingTop: 0 }}
                      onClick={() => onNavigate && onNavigate('promotionDetail', { promotionId: p.id })}
                      onKeyDown={(e) => e.key === 'Enter' && onNavigate && onNavigate('promotionDetail', { promotionId: p.id })}
                      role="button"
                      tabIndex={0}
                    >
                      <p className="faq__question" style={{ marginBottom: 0, fontWeight: 400 }}>{getShortDescription(p)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
      <div className="upgrade__footer">
        <button
          type="button"
          className="upgrade__back-button"
          onClick={() => onBack && onBack()}
        >
          {t('header.account.back')}
          <img src={backIcon} alt="back" width={29} height={21} />
        </button>
      </div>
    </section>
  )
}
