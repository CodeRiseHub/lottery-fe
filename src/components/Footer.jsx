import { useEffect } from 'react'
import storeIcon from '../assets/images/nav/store.png'
import earnIcon from '../assets/images/nav/earn.png'
import lotteryIcon from '../assets/images/nav/lottery.png'
import taskIcon from '../assets/images/nav/task.png'
import payoutIcon from '../assets/images/nav/payout.png'
import { t } from '../i18n'
import './Footer.css'

export default function Footer({ currentScreen, onNavigate }) {
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

  const navItems = [
    { id: 'store', label: t('nav.store'), icon: storeIcon, href: '#store' },
    { id: 'earn', label: t('nav.earn'), icon: earnIcon, href: '#earn' },
    { id: 'game', label: t('nav.game'), icon: lotteryIcon, href: '#game' },
    { id: 'tasks', label: t('nav.tasks'), icon: taskIcon, href: '#tasks' },
    { id: 'payout', label: t('nav.payout'), icon: payoutIcon, href: '#payout' }
  ]

  return (
    <footer className="footer">
      <div className="container footer__container">
        <nav className="footer__nav">
          <ul className="footer__list">
            {navItems.map((item) => {
              const isActive = currentScreen === item.id || 
                               (item.id === 'game' && currentScreen === 'main') ||
                               (item.id === 'earn' && currentScreen === 'referral')
              return (
                <li key={item.id} className="footer__item">
                  <span className={isActive ? 'footer__link-border' : ''}>
                    <a
                      href={item.href}
                      className={`footer__link ${isActive ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault()
                        if (onNavigate) {
                          if (item.id === 'game') {
                            onNavigate('main')
                          } else if (item.id === 'earn') {
                            onNavigate('referral')
                          } else {
                            onNavigate(item.id)
                          }
                        }
                      }}
                    >
                      <img
                        src={item.icon}
                        alt={item.id}
                        className="footer__icon"
                        width="33"
                        height="33"
                      />
                      <span className={isActive ? 'footer__text footer__text--upgrade' : 'footer__text'}>
                        {item.label}
                      </span>
                    </a>
                  </span>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </footer>
  )
}

