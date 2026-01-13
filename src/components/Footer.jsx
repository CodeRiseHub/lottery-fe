import { useEffect } from 'react'
import upgradeIcon from '../assets/images/nav/upgrade.png'
import earnIcon from '../assets/images/nav/earn.png'
import minerIcon from '../assets/images/nav/miner.png'
import taskIcon from '../assets/images/nav/task.png'
import payoutIcon from '../assets/images/nav/payout.png'

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
    { id: 'upgrade', label: 'Shop', icon: upgradeIcon, href: '#upgrade' },
    { id: 'earn', label: 'Earn', icon: earnIcon, href: '#earn' },
    { id: 'miner', label: 'Miner', icon: minerIcon, href: '#miner' },
    { id: 'tasks', label: 'Tasks', icon: taskIcon, href: '#tasks' },
    { id: 'payout', label: 'Withdraw', icon: payoutIcon, href: '#payout' }
  ]

  return (
    <footer className="footer">
      <div className="container footer__container">
        <nav className="footer__nav">
          <ul className="footer__list">
            {navItems.map((item) => (
              <li key={item.id} className="footer__item">
                <span className={item.id === 'upgrade' ? 'footer__link-border' : ''}>
                  <a
                    href={item.href}
                    className={`footer__link ${currentScreen === item.id ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault()
                      if (onNavigate) {
                        onNavigate(item.id)
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
                    <span className={`footer__text ${item.id === 'upgrade' ? 'footer__text--upgrade' : ''}`}>
                      {item.label}
                    </span>
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}

