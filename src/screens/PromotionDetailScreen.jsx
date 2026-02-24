import { useState, useEffect, useCallback } from 'react'
import { getPromotionDetail } from '../api'
import { t } from '../i18n'

const STATUS_ACTIVE = 'ACTIVE'
const STATUS_PLANNED = 'PLANNED'
const STATUS_FINISHED = 'FINISHED'
const TICKETS_UNIT = 1_000_000

function formatRewardTickets(value) {
  if (value == null || value === 0) return '-'
  return (Number(value) / TICKETS_UNIT).toLocaleString()
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
  const now = Date.now()

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
        load()
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
  }, [detail, status, startTime, endTime, load])

  if (loading) {
    return (
      <section className="faq">
        <div className="container">
          <p style={{ textAlign: 'center', color: 'var(--text-secondary, #ccc)' }}>{t('promo.loading')}</p>
          <div className="faq__actions" style={{ marginTop: '16px' }}>
            <a href="#" onClick={(e) => { e.preventDefault(); onBack && onBack(); }} className="faq__button">{t('header.account.back')}</a>
          </div>
        </div>
      </section>
    )
  }

  if (error || !detail) {
    return (
      <section className="faq">
        <div className="container">
          <p style={{ textAlign: 'center', color: 'var(--error, #e74c3c)' }}>{error || t('promo.error')}</p>
          <div className="faq__actions" style={{ marginTop: '16px' }}>
            <a href="#" onClick={(e) => { e.preventDefault(); onBack && onBack(); }} className="faq__button">{t('header.account.back')}</a>
          </div>
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

  return (
    <section className="faq">
      <div className="container">
        <h1 className="title">{title}</h1>

        {description && (
          <div style={{ whiteSpace: 'pre-wrap', marginBottom: '20px', color: 'var(--text-primary, #fff)' }}>
            {description}
          </div>
        )}

        {status === STATUS_ACTIVE && timeLeft != null && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ marginBottom: '6px', color: 'var(--text-secondary, #ccc)' }}>{t('promo.detail.timeLeftEnd')}</p>
            <p style={{ fontWeight: 'bold', color: 'var(--text-primary, #fff)' }}>{timeLeft.str}</p>
          </div>
        )}

        {status === STATUS_PLANNED && timeLeft != null && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ marginBottom: '6px', color: 'var(--text-secondary, #ccc)' }}>{t('promo.detail.timeLeftStart')}</p>
            <p style={{ fontWeight: 'bold', color: 'var(--text-primary, #fff)' }}>{timeLeft.str}</p>
          </div>
        )}

        {status === STATUS_FINISHED && (
          <p style={{ marginBottom: '20px', color: 'var(--text-primary, #fff)' }}>{t('promo.detail.ended')}</p>
        )}

        <div style={{ marginBottom: '16px' }}>
          <p style={{ marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-primary, #fff)' }}>{t('promo.detail.yourPosition', { x: userPosition, y: userTotal })}</p>
          <p style={{ margin: 0, color: 'var(--text-primary, #fff)' }}>{t('promo.detail.youHavePoints', { amount: userPoints.toLocaleString() })}</p>
        </div>

        <h3 style={{ fontSize: '18px', marginBottom: '12px', color: 'var(--text-primary, #fff)' }}>{t('promo.detail.leaderboard')}</h3>
        <div className="transaction__table">
          <div className="transaction__row" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ flex: '0 0 50px' }}>{t('promo.detail.place')}</div>
            <div style={{ flex: 1, minWidth: 0 }}>{t('promo.detail.user')}</div>
            <div style={{ flex: '0 0 70px', textAlign: 'right' }}>{t('promo.detail.points')}</div>
            <div style={{ flex: '0 0 90px', textAlign: 'right' }}>{t('promo.detail.possiblePrize')}</div>
          </div>
          {leaderboard.slice(0, 30).map((row, idx) => (
            <div key={`${row.place}-${idx}`} className="transaction__row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: '0 0 50px' }}>{row.place}</div>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.screenName || '-'}</div>
              <div style={{ flex: '0 0 70px', textAlign: 'right' }}>{(row.points != null ? Number(row.points).toLocaleString() : '-')}</div>
              <div style={{ flex: '0 0 90px', textAlign: 'right' }}>{formatRewardTickets(row.rewardTickets)}</div>
            </div>
          ))}
        </div>

        <div className="faq__actions" style={{ marginTop: '24px' }}>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onBack && onBack(); }}
            className="faq__button"
          >
            {t('header.account.back')}
          </a>
        </div>
      </div>
    </section>
  )
}
