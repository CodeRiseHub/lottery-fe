import { useState, useEffect } from 'react'
import { initTabs } from '../utils/tabs'
import refIcon from '../assets/images/ref.png'
import pagLeftIcon from '../assets/images/tasks/pag-left.png'
import pagRightIcon from '../assets/images/tasks/pag-right.png'
import './ReferralScreen.css'

export default function ReferralScreen({ onBack }) {
  const [activeTab, setActiveTab] = useState('invite')
  const [activeLevel, setActiveLevel] = useState(1)
  const [referralLink] = useState('https://t.me/secretminerbot?start=123')
  
  // Different referrals for each level (just reordered for demo)
  const referralsByLevel = {
    1: [
      { name: 'Ali Hassan', commission: '0.0000 USD' },
      { name: 'rashd abed', commission: '0.0000 USD' },
      { name: 'ali2 hassan2', commission: '0.0000 USD' },
      { name: '🐍Hicham5 Ach', commission: '0.0000 USD' },
      { name: 'Charlotte Mills', commission: '0.0000 USD' }
    ],
    2: [
      { name: 'Charlotte Mills', commission: '0.0000 USD' },
      { name: '🐍Hicham5 Ach', commission: '0.0000 USD' },
      { name: 'ali2 hassan2', commission: '0.0000 USD' },
      { name: 'rashd abed', commission: '0.0000 USD' },
      { name: 'Ali Hassan', commission: '0.0000 USD' }
    ],
    3: [
      { name: 'ali2 hassan2', commission: '0.0000 USD' },
      { name: 'Ali Hassan', commission: '0.0000 USD' },
      { name: 'Charlotte Mills', commission: '0.0000 USD' },
      { name: 'rashd abed', commission: '0.0000 USD' },
      { name: '🐍Hicham5 Ach', commission: '0.0000 USD' }
    ]
  }
  
  const referrals = referralsByLevel[activeLevel] || referralsByLevel[1]
  const showPagination = referrals.length > 50 // Will be controlled by backend later

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
      // TODO: Show success message
      alert('Link copied to clipboard!')
    }).catch(() => {
      alert('Failed to copy link')
    })
  }

  const inviteUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('This bot actually pays!\nNo joke.\nJust a little secret between us 😏👇\n')}`

  return (
    <section>
      <div className="container">
        <p className="title">Invite friends!</p>
        <div className="tabs" data-tabs>
          <ul className="tabs__nav tabs__nav-second" data-tabs-nav>
            <li data-tab-target="invite" className={activeTab === 'invite' ? 'active' : ''} onClick={() => setActiveTab('invite')}>
              <span>Invite</span>
            </li>
            <li data-tab-target="bonuses" className={activeTab === 'bonuses' ? 'active' : ''} onClick={() => setActiveTab('bonuses')}>
              <span>Bonuses</span>
            </li>
            <div className="tabs__active-border tabs__active-position-second tabs__active-position">
              <span className="tabs__active-bg tabs__active-position"></span>
            </div>
          </ul>

          <div className="tabs__content" data-tab-content="invite" hidden={activeTab !== 'invite'}>
            <div className="tabs__content--invite">
              <div className="earn">
                <p className="earn__label">Your personal referral link:</p>

                <div className="earn__link-wrapper">
                  <p className="earn__link" id="link_for_copy">{referralLink}</p>
                  <div className="earn__copy-border">
                    <span
                      className="earn__copy"
                      id="copy_link_button"
                      title="Copy to clipboard"
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
                    <a href={inviteUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      INVITE FRIEND
                    </a>
                  </span>
                </button>
              </div>
              
              <p className="earn__levels-title">Your referrals by level</p>
              <div className="earn__levels"> 
                <p className={`earn__level ${activeLevel === 1 ? 'active' : ''}`}>
                  <span>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setActiveLevel(1)
                      }}
                    >
                      1 Level
                    </a>
                  </span>
                </p>
                <p className={`earn__level ${activeLevel === 2 ? 'active' : ''}`}>
                  <span>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setActiveLevel(2)
                      }}
                    >
                      2 Level
                    </a>
                  </span>
                </p>
                <p className={`earn__level ${activeLevel === 3 ? 'active' : ''}`}>
                  <span>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setActiveLevel(3)
                      }}
                    >
                      3 Level
                    </a>
                  </span>
                </p>
              </div>
              
              <div className="earn__list">
                <div className="earn__list-header">
                  <p className="earn__list-col">Name</p>
                  <p className="earn__list-col">Commission</p>
                </div>

                {referrals.map((referral, index) => (
                  <div key={index} className="earn__list-item">
                    <p className="earn__list-name">{referral.name}</p>
                    <p className="earn__list-amount">{referral.commission}</p>
                  </div>
                ))}
              </div>
              
              {showPagination && (
                <div className="earn__pagination">
                  <button className="earn__pagination-button">
                    <img className="pagination__icon" src={pagLeftIcon} alt="prev" />
                  </button>
                  <p className="earn__pagination-info">Page 1 of 1</p>
                  <button className="earn__pagination-button">
                    <img className="pagination__icon" src={pagRightIcon} alt="Next" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="tabs__content" data-tab-content="bonuses" hidden={activeTab !== 'bonuses'}>
            <div className="tabs__content--bonuses bonuses">
              <p className="bonuses__title">Earn Rewards for Inviting Friends!</p>

              <div className="bonuses__list">
                <p className="bonuses__item">
                  Boost your mining power by
                  <span className="bonuses__highlight">+200 POWER</span> for
                  every user who registers through your unique referral
                  link!
                </p>

                <p className="bonuses__item--dark">
                  <span className="bonuses__highlight">Important!</span> The
                  200 POWER referral bonus is added to the bonus for
                  completing the friend invitation task. This means you
                  will receive at least
                  <span className="bonuses__highlight">450 POWER</span> to your
                  power for each invited friend.
                </p>

                <p className="bonuses__item bonuses__item--line">
                  Get
                  <span className="bonuses__highlight">2,500 POWER</span> when
                  your referred friend makes their first deposit — no
                  matter the amount!
                </p>

                <div className="bonuses__item">
                  Plus, earn ongoing commissions from all
                  <span className="bonuses__highlight">spending/deposits</span>
                  made by your referrals within the project:
                  <p className="bonuses__item--flex">
                    <span className="bonuses__level"><span>– 15% </span> of the amount spent by your 1st-level referrals</span>
                    <span className="bonuses__level"><span>– 7%</span>  of the amount spent by your 2nd-level referrals</span>
                    <span className="bonuses__level"><span>– 2% </span> of the amount spent by your 3rd-level referrals</span>
                  </p>
                </div>

                <p className="bonuses__item--dark bonuses__note">
                  *Rewards are credited instantly to your balance, and you
                  can request a payout at any time.
                </p>

                <p className="bonuses__item bonuses__warning">
                  ⚠️ Important: To prevent fraud, the bonus for inviting a
                  friend is awarded only after they start mining in the
                  app.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

