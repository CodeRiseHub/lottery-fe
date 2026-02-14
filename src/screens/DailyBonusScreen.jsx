import { useState, useEffect, useCallback } from 'react'
import { getDailyBonusStatus, claimTask, fetchCurrentUser, getRecentDailyBonusClaims } from '../api'
import ticketIcon from '../assets/images/header/ticket_horizontal.png'
import ParticipantAvatar from '../components/ParticipantAvatar'
import { t, subscribeToLanguageChange } from '../i18n'

export default function DailyBonusScreen({ onBack, onNavigate, onBalanceUpdate, onUserDataUpdate }) {
  const [bonusStatus, setBonusStatus] = useState(null)
  const [isClaiming, setIsClaiming] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const [error, setError] = useState('')
  const [recentClaims, setRecentClaims] = useState([])
  const [loadingClaims, setLoadingClaims] = useState(true)

  const loadBonusStatus = useCallback(async () => {
    try {
      const status = await getDailyBonusStatus()
      setBonusStatus(status)
      setError('')
    } catch (error) {
      setError(t('dailyBonus.error.loadFailed'))
      console.error('Error loading daily bonus status:', error)
    }
  }, [])

  useEffect(() => {
    const footer = document.querySelector('.footer')
    if (!footer) return

    const handleTouchMove = (event) => {
      event.preventDefault()
    }

    const handleTouchStart = (event) => {
      event.stopPropagation()
    }

    footer.addEventListener('touchmove', handleTouchMove, { passive: false })
    footer.addEventListener('touchstart', handleTouchStart, { passive: false })

    return () => {
      footer.removeEventListener('touchmove', handleTouchMove)
      footer.removeEventListener('touchstart', handleTouchStart)
    }
  }, [])

  // Load bonus status on mount
  useEffect(() => {
    loadBonusStatus()
  }, [loadBonusStatus])

  // Load recent claims function
  const loadRecentClaims = useCallback(async () => {
    try {
      setLoadingClaims(true)
      const claims = await getRecentDailyBonusClaims()
      setRecentClaims(claims || [])
    } catch (error) {
      console.error('Error loading recent claims:', error)
      setRecentClaims([])
    } finally {
      setLoadingClaims(false)
    }
  }, [])

  // Load recent claims on mount
  useEffect(() => {
    loadRecentClaims()
  }, [loadRecentClaims])

  // Refetch recent claims when language changes (to update localized "at" word in dates)
  useEffect(() => {
    const unsubscribe = subscribeToLanguageChange(() => {
      loadRecentClaims()
    })
    return () => {
      unsubscribe()
    }
  }, [loadRecentClaims])

  // Update countdown every second
  useEffect(() => {
    if (!bonusStatus || bonusStatus.available || !bonusStatus.cooldownSeconds) {
      setCountdown(null)
      return
    }

    // Calculate initial time when countdown started
    const startTime = Date.now()
    const initialSeconds = bonusStatus.cooldownSeconds

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const remainingSeconds = Math.max(0, initialSeconds - elapsed)

      if (remainingSeconds <= 0) {
        setCountdown(null)
        // Reload status to get updated availability
        loadBonusStatus()
        clearInterval(interval)
      } else {
        setCountdown(formatCountdown(remainingSeconds))
      }
    }, 1000)

    // Set initial countdown
    setCountdown(formatCountdown(initialSeconds))

    return () => clearInterval(interval)
  }, [bonusStatus, loadBonusStatus])

  const formatCountdown = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleClaim = async () => {
    if (!bonusStatus || !bonusStatus.available || isClaiming) {
      return
    }

    setIsClaiming(true)
    setError('')

    try {
      const response = await claimTask(bonusStatus.taskId)

      if (response.success) {
        // Update balance immediately
        const userData = await fetchCurrentUser()
        if (userData) {
          if (onUserDataUpdate) {
            onUserDataUpdate(userData)
          }
          if (onBalanceUpdate) {
            const balanceDisplay = (userData.balanceA / 1_000_000).toFixed(2)
            onBalanceUpdate(balanceDisplay)
          }
        }

        // Reload status to update cooldown
        await loadBonusStatus()

        // Reload recent claims to show the new claim (refresh table after successful claim)
        // This ensures the table is updated immediately after claiming
        try {
          const claims = await getRecentDailyBonusClaims()
          setRecentClaims(claims || [])
        } catch (error) {
          console.error('Error refreshing recent claims:', error)
          // Don't show error to user, just log it - table will update on next page load
        }
      } else {
        setError(response.message || t('dailyBonus.error.claimFailed'))
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message || t('dailyBonus.error.claimFailed'))
      console.error('Error claiming daily bonus:', error)
    } finally {
      setIsClaiming(false)
    }
  }


  const isButtonDisabled = !bonusStatus || !bonusStatus.available || isClaiming

  return (
    <section className="upgrade">
      <div className="container">
        <h1 className="title">{t('dailyBonus.title')}</h1>

        <div className="upgrade__store-border">
          <div className="upgrade__store">
            {bonusStatus && (
              <>
                {bonusStatus.available ? (
                  <p className="upgrade__label" style={{ textAlign: 'center', marginBottom: '20px' }}>
                    {t('dailyBonus.available')}
                  </p>
                ) : (
                  <p className="upgrade__label" style={{ textAlign: 'center', marginBottom: '20px' }}>
                    {t('dailyBonus.cooldown')}
                  </p>
                )}

                <span className="upgrade__button-border" style={isButtonDisabled ? { opacity: 0.6 } : {}}>
                  {!bonusStatus.available ? <p className='upgrade__time'>{countdown}</p> :
                    <a
                      href="#"
                      className="upgrade__button"
                      onClick={(e) => {
                        e.preventDefault()
                        if (!isButtonDisabled) {
                          handleClaim()
                        }
                      }}
                      style={{
                        background: isButtonDisabled ? 'rgba(90, 126, 213, 0.4)' : 'var(--gradient-secondary)',
                        opacity: isButtonDisabled ? 0.7 : 1,
                        pointerEvents: isButtonDisabled ? 'none' : 'auto',
                        cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        filter: isButtonDisabled ? 'brightness(0.6)' : 'none'
                      }}
                    >
                      {isClaiming ? (
                        t('dailyBonus.claiming')
                      ) : bonusStatus.available ? (
                        <>
                          {t('dailyBonus.claim')}
                          <img src={ticketIcon} alt="ticket" width="39" height="28" style={{ display: 'inline-block' }} />
                        </>
                      ) : (
                        t('dailyBonus.claimed')
                      )}
                    </a>}
                </span>
              </>
            )}

            {error && (
              <p className="upgrade__label" style={{ color: 'red', fontWeight: 'bold', marginTop: '10px', textAlign: 'center' }}>
                {error}
              </p>
            )}

            {/* Recent Claims Table */}
            <div className="daily-bonus__claims" style={{ marginTop: '30px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                marginBottom: '15px',
                textAlign: 'center',
                color: 'var(--text-primary, #fff)'
              }}>
                {t('dailyBonus.recentClaims.title')}
              </h3>

              {loadingClaims ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary, #ccc)' }}>
                  {t('dailyBonus.recentClaims.loading')}
                </div>
              ) : recentClaims.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary, #ccc)' }}>
                  {t('dailyBonus.recentClaims.noData')}
                </div>
              ) : (
                <div className="transaction__table">
                  {recentClaims.map((claim, index) => (
                    <div key={`claim-${index}-${claim.claimedAt}`} className="transaction__row">
                      <div className="transaction__main" style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                        <div style={{ flex: '0 0 40px' }}>
                          <ParticipantAvatar
                            avatarUrl={claim.avatarUrl}
                            userId={index}
                            size={40}
                          />
                        </div>
                        <p style={{
                          margin: 0,
                          flex: '1',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          minWidth: 0
                        }}>
                          {claim.screenName || '-'}
                        </p>
                        <p className="transaction__date" style={{ margin: 0, flex: '0 0 auto', textAlign: 'right', paddingLeft: '10px' }}>
                          {claim.date || '-'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

