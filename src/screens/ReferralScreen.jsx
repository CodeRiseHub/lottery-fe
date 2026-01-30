import { useState, useEffect } from 'react'
import { initTabs } from '../utils/tabs'
import { fetchReferrals } from '../api'
import { t } from '../i18n'
import refIcon from '../assets/images/ref.png'
import pagLeftIcon from '../assets/images/tasks/pag-left.png'
import pagRightIcon from '../assets/images/tasks/pag-right.png'

export default function ReferralScreen({ onBack, userData }) {
  const [activeTab, setActiveTab] = useState('invite')
  const [activeLevel, setActiveLevel] = useState(1)
  const [referrals, setReferrals] = useState([])
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  
  // Generate referral link dynamically using user ID
  const referralLink = userData?.id 
    ? `https://t.me/wspin_bot?start=${userData.id}`
    : 'https://t.me/wspin_bot?start=0'
  
  // Format commission: divide by 1,000,000 and format as Tickets
  const formatCommission = (commission) => {
    if (!commission || commission === 0) {
      return `0.00 ${t('tasks.tickets')}`
    }
    const value = commission / 1_000_000
    return `${value.toFixed(2)} ${t('tasks.tickets')}`
  }
  
  // Fetch referrals when level or page changes
  useEffect(() => {
    const loadReferrals = async () => {
      if (!userData?.id) return
      
      setLoading(true)
      try {
        const response = await fetchReferrals(activeLevel, currentPage)
        setReferrals(response.referrals || [])
        setCurrentPage(response.currentPage || 0)
        setTotalPages(response.totalPages || 0)
        setTotalElements(response.totalElements || 0)
      } catch (error) {
        setReferrals([])
        setCurrentPage(0)
        setTotalPages(0)
        setTotalElements(0)
      } finally {
        setLoading(false)
      }
    }
    
    loadReferrals()
  }, [activeLevel, currentPage, userData?.id])
  
  const showPagination = totalPages > 1
  
  const handleLevelChange = (level) => {
    setActiveLevel(level)
    setCurrentPage(0) // Reset to first page when level changes
  }
  
  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }
  
  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

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

  useEffect(() => {
    if (typeof window.$ !== 'undefined') {
      initTabs()
      
      // Update active border position when tab changes
      const tabsBlock = window.$('[data-tabs]')
      const nav = tabsBlock.find('[data-tabs-nav]')
      const tabButtons = nav.find('[data-tab-target]')
      const activeBg = nav.find('.tabs__active-border')
      
      const activeIndex = tabButtons.toArray().findIndex(btn => {
        const target = window.$(btn).attr('data-tab-target')
        return target === activeTab
      })
      
      if (activeIndex >= 0 && activeBg.length) {
        const tabCount = tabButtons.length
        // For 2 tabs, the active border width is 50% of container (minus padding)
        // To move it to the second tab, we need to move by 100% of its own width
        // So: index 0 = 0%, index 1 = 100% (of the active border's width)
        const offset = activeIndex * 100
        activeBg.css('transform', `translateX(${offset}%)`)
      }
    }
  }, [activeTab])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      alert(t('referral.linkCopied'))
    }).catch(() => {
      alert(t('referral.linkCopyFailed'))
    })
  }

  const inviteUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('This bot actually pays!\nNo joke.\nJust a little secret between us 😏👇\n')}`

  return (
    <section>
      <div className="container">
        <p className="title">{t('referral.title')}</p>
        <div className="tabs" data-tabs>
          <ul className="tabs__nav tabs__nav-second" data-tabs-nav>
            <li data-tab-target="invite" className={activeTab === 'invite' ? 'active' : ''} onClick={() => setActiveTab('invite')}>
              <span>{t('referral.invite')}</span>
            </li>
            <li data-tab-target="bonuses" className={activeTab === 'bonuses' ? 'active' : ''} onClick={() => setActiveTab('bonuses')}>
              <span>{t('referral.bonuses')}</span>
            </li>
            <div className="tabs__active-border tabs__active-position-second tabs__active-position">
              <span className="tabs__active-bg tabs__active-position"></span>
            </div>
          </ul>

          <div className="tabs__content" data-tab-content="invite" hidden={activeTab !== 'invite'}>
            <div className="tabs__content--invite">
              <div className="earn">
                <p className="earn__label">{t('referral.yourLink')}</p>

                <div className="earn__link-wrapper">
                  <p className="earn__link" id="link_for_copy">{referralLink}</p>
                  <div className="earn__copy-border">
                    <span
                      className="earn__copy"
                      id="copy_link_button"
                      title={t('referral.copyToClipboard')}
                      onClick={handleCopyLink}
                    >
                      <img
                        src={refIcon}
                        alt="ref"
                        width="34"
                        height="34"
                        id="copy_status"
                      />
                    </span>
                  </div>
                </div>
                
                <button className="earn__button">
                  <span>
                    <a href={inviteUrl} style={{ textDecoration: 'none' }}>
                      {t('referral.inviteFriend')}
                    </a>
                  </span>
                </button>
              </div>
              
              <p className="earn__levels-title">{t('referral.levels.title')}</p>
              <div className="earn__levels"> 
                <p className={`earn__level ${activeLevel === 1 ? 'active' : ''}`}>
                  <span>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        handleLevelChange(1)
                      }}
                    >
                      {t('referral.levels.level1')}
                    </a>
                  </span>
                </p>
                <p className={`earn__level ${activeLevel === 2 ? 'active' : ''}`}>
                  <span>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        handleLevelChange(2)
                      }}
                    >
                      {t('referral.levels.level2')}
                    </a>
                  </span>
                </p>
                <p className={`earn__level ${activeLevel === 3 ? 'active' : ''}`}>
                  <span>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        handleLevelChange(3)
                      }}
                    >
                      {t('referral.levels.level3')}
                    </a>
                  </span>
                </p>
              </div>
              
              <div className="earn__list">
                <div className="earn__list-header">
                  <p className="earn__list-col">{t('referral.list.name')}</p>
                  <p className="earn__list-col">{t('referral.list.commission')}</p>
                </div>

                {loading ? (
                  <div style={{ padding: '20px', textAlign: 'center' }}>{t('referral.list.loading')}</div>
                ) : referrals.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center' }}>{t('referral.list.noData')}</div>
                ) : (
                  referrals.map((referral, index) => (
                    <div key={index} className="earn__list-item">
                      <p className="earn__list-name">{referral.name}</p>
                      <p className="earn__list-amount">{formatCommission(referral.commission)}</p>
                    </div>
                  ))
                )}
              </div>
              
              {showPagination && (
                <div className="earn__pagination">
                  <button 
                    className="earn__pagination-button"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 0 || loading}
                  >
                    <img className="pagination__icon" src={pagLeftIcon} alt="prev" />
                  </button>
                  <p className="earn__pagination-info">{t('referral.pagination', { current: currentPage + 1, total: totalPages })}</p>
                  <button 
                    className="earn__pagination-button"
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages - 1 || loading}
                  >
                    <img className="pagination__icon" src={pagRightIcon} alt="Next" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="tabs__content" data-tab-content="bonuses" hidden={activeTab !== 'bonuses'}>
            <div className="tabs__content--bonuses bonuses">
              <p className="bonuses__title">{t('referral.bonuses.title')}</p>

              <div className="bonuses__list">
                <p className="bonuses__item">
                  {t('referral.bonuses.intro')} 🎫.
                </p>

                <p className="bonuses__item">
                  {t('referral.bonuses.additional')}
                </p>

                <p className="bonuses__item bonuses__item--line">
                  <span className="bonuses__highlight">{t('referral.bonuses.percentages.title')}</span>
                </p>

                <div className="bonuses__item">
                  <p className="bonuses__level-title">{t('referral.bonuses.percentages.level1.title')}</p>
                  <p className="bonuses__level">
                    <span>• {t('referral.bonuses.percentages.level1.loss')}</span>
                  </p>
                  <p className="bonuses__level">
                    <span>• {t('referral.bonuses.percentages.level1.win')}</span>
                  </p>
                </div>

                <div className="bonuses__item">
                  <p className="bonuses__level-title">{t('referral.bonuses.percentages.level2.title')}</p>
                  <p className="bonuses__level">
                    <span>• {t('referral.bonuses.percentages.level2.loss')}</span>
                  </p>
                  <p className="bonuses__level">
                    <span>• {t('referral.bonuses.percentages.level2.win')}</span>
                  </p>
                </div>

                <div className="bonuses__item">
                  <p className="bonuses__level-title">{t('referral.bonuses.percentages.level3.title')}</p>
                  <p className="bonuses__level">
                    <span>• {t('referral.bonuses.percentages.level3.loss')}</span>
                  </p>
                  <p className="bonuses__level">
                    <span>• {t('referral.bonuses.percentages.level3.win')}</span>
                  </p>
                </div>

                <p className="bonuses__item--dark bonuses__note">
                  {t('referral.bonuses.percentages.note')}
                </p>

                <p className="bonuses__item bonuses__item--line">
                  {t('referral.bonuses.unlimited')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

