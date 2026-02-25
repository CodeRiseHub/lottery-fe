import { useState, useEffect, useCallback } from 'react'
import { getPromotionDetail } from '../api'
import { t } from '../i18n'
import backIcon from '../assets/images/back.png'
import ticketIcon from '../assets/images/header/ticket_horizontal_1.png'

const STATUS_ACTIVE = 'ACTIVE'
const STATUS_PLANNED = 'PLANNED'
const STATUS_FINISHED = 'FINISHED'

/** Backend already returns rewardTickets in display units (divided by 1_000_000). */
function formatRewardTickets(value) {
  if (value == null || value === 0) return '-'
  return Number(value).toLocaleString()
}

function getDetailTitle(type) {
  const upper = (type || '').toUpperCase()
  if (upper === 'NET_WIN') return t('promo.detail.net_win.title')
  return type || ''
}

function getDetailDescription(type) {
  const upper = (type || '').toUpperCase()
  if (upper === 'NET_WIN') return t('promo.detail.net_win.description')
  return ''
}

function formatTimeLeft(ms, tTimer) {
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0 }
  const s = Math.floor(ms / 1000) % 60
  const m = Math.floor(ms / 60000) % 60
  const h = Math.floor(ms / 3600000) % 24
  const d = Math.floor(ms / 86400000)
  return {
    str: `${d} ${tTimer.d} ${h} ${tTimer.h} ${m} ${tTimer.m} ${s} ${tTimer.s}`,
    d, h, m, s
  }
}

export default function PromotionDetailScreen({ promotionId, onBack, onNavigate }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(null)

  const load = useCallback(async () => {
    if (promotionId == null) return
    try {
      setLoading(true)
      setError('')
      const data = await getPromotionDetail(promotionId)
      setDetail(data || null)
    } catch (e) {
      setError(t('promo.error'))
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [promotionId])

  useEffect(() => {
    load()
  }, [load])

  const status = detail?.status
  const startTime = detail?.startTime ? new Date(detail.startTime).getTime() : null
  const endTime = detail?.endTime ? new Date(detail.endTime).getTime() : null

  useEffect(() => {
    if (!detail || !status) return
    let targetTs = null
    if (status === STATUS_ACTIVE && endTime != null) targetTs = endTime
    if (status === STATUS_PLANNED && startTime != null) targetTs = startTime
    if (targetTs == null || status === STATUS_FINISHED) {
      setTimeLeft(null)
      return
    }
    const tick = () => {
      const remaining = targetTs - Date.now()
      if (remaining <= 0) {
        setTimeLeft(null)
        return
      }
      setTimeLeft(formatTimeLeft(remaining, {
        d: t('promo.timer.d'),
        h: t('promo.timer.h'),
        m: t('promo.timer.m'),
        s: t('promo.timer.s')
      }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [detail?.id, status, startTime, endTime])

  if (loading) {
    return (
      <section className="faq promotion-detail">
        <div className="container" style={{ marginBottom: '150px' }}>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary, #ccc)' }}>{t('promo.loading')}</p>
        </div>
        <div className="upgrade__footer">
          <button type="button" className="upgrade__back-button" onClick={() => onBack && onBack()}>
            {t('header.account.back')}
            <img src={backIcon} alt="back" width={29} height={21} />
          </button>
        </div>
      </section>
    )
  }

  if (error || !detail) {
    return (
      <section className="faq promotion-detail">
        <div className="container" style={{ marginBottom: '150px' }}>
          <p style={{ textAlign: 'center', color: 'var(--error, #e74c3c)' }}>{error || t('promo.error')}</p>
        </div>
        <div className="upgrade__footer">
          <button type="button" className="upgrade__back-button" onClick={() => onBack && onBack()}>
            {t('header.account.back')}
            <img src={backIcon} alt="back" width={29} height={21} />
          </button>
        </div>
      </section>
    )
  }

  const title = getDetailTitle(detail.type)
  const description = getDetailDescription(detail.type)
  const leaderboard = detail.leaderboard || []
  const userPosition = detail.userPosition != null ? detail.userPosition : 0
  const userTotal = detail.userTotal != null ? detail.userTotal : 0
  const userPoints = detail.userPoints != null ? Number(detail.userPoints) : 0

  const centerStyle = { textAlign: 'center' }
  const yellowColor = '#f5d076'
  return (
    <section className="faq promotion-detail">
      <div className="container" style={{ marginBottom: '150px' }}>
        <h1 className="title" style={centerStyle}>{title}</h1>

        {description && (
          <div className="faq__list" style={{ marginBottom: '16px' }}>
            <div className="faq__item" style={{ border: 'none', paddingTop: 0 }}>
              <p className="faq__question" style={{ marginBottom: 0, fontWeight: 400, whiteSpace: 'pre-wrap' }}>{description}</p>
            </div>
          </div>
        )}

        {(status === STATUS_ACTIVE && timeLeft != null) || (status === STATUS_PLANNED && timeLeft != null) || status === STATUS_FINISHED ? (
          <div className="faq__list" style={{ marginBottom: '20px' }}>
            <div className="faq__item" style={{ border: 'none', paddingTop: 0, ...centerStyle }}>
              {status === STATUS_ACTIVE && timeLeft != null && (
                <>
                  <p style={{ marginBottom: '8px', fontSize: '24px', color: 'var(--text-secondary, #ccc)' }}>{t('promo.detail.timeLeftEnd')}</p>
                  <p style={{ fontWeight: 'bold', fontSize: '28px', color: 'var(--text-primary, #fff)' }}>{timeLeft.str}</p>
                </>
              )}
              {status === STATUS_PLANNED && timeLeft != null && (
                <>
                  <p style={{ marginBottom: '8px', fontSize: '24px', color: 'var(--text-secondary, #ccc)' }}>{t('promo.detail.timeLeftStart')}</p>
                  <p style={{ fontWeight: 'bold', fontSize: '28px', color: 'var(--text-primary, #fff)' }}>{timeLeft.str}</p>
                </>
              )}
              {status === STATUS_FINISHED && (
                <p style={{ margin: 0, fontSize: '22px', color: 'var(--text-primary, #fff)' }}>{t('promo.detail.ended')}</p>
              )}
            </div>
          </div>
        ) : null}

        <h3 style={{ fontSize: '18px', marginBottom: '12px', color: 'var(--text-primary, #fff)', ...centerStyle }}>{t('promo.detail.leaderboard')}</h3>
        <div className="transaction__table">
          <div className="transaction__row" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <div style={{ flex: '0 0 50px', textAlign: 'center' }} title={t('promo.detail.place')} aria-label={t('promo.detail.place')}>🏆</div>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>{t('promo.detail.user')}</div>
            <div style={{ flex: '0 0 70px', textAlign: 'center' }}>{t('promo.detail.points')}</div>
            <div style={{ flex: '0 0 90px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              {t('promo.detail.prize')}
              <img src={ticketIcon} alt="" width="14" height="10" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
            </div>
          </div>
          {leaderboard.slice(0, 30).map((row, idx) => (
            <div key={`${row.place}-${idx}`} className="transaction__row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: '0 0 50px', textAlign: 'center' }}>{row.place}</div>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>{row.screenName || '-'}</div>
              <div style={{ flex: '0 0 70px', textAlign: 'center' }}>{(row.points != null ? Number(row.points).toLocaleString() : '-')}</div>
              <div style={{ flex: '0 0 90px', textAlign: 'center' }}>{formatRewardTickets(row.rewardTickets)}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', padding: '14px', borderRadius: '12px', background: 'rgba(245, 208, 118, 0.15)', border: '1px solid rgba(245, 208, 118, 0.4)', ...centerStyle }}>
          <p style={{ marginBottom: '8px', fontWeight: 'bold', color: yellowColor, fontSize: '18px' }}>{t('promo.detail.yourPosition', { x: userPosition, y: userTotal })}</p>
          <p style={{ margin: 0, color: yellowColor, fontSize: '16px' }}>{t('promo.detail.youHavePoints', { amount: userPoints.toLocaleString() })}</p>
        </div>
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
