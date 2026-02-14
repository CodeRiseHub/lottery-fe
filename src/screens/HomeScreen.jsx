import { useEffect, useRef } from 'react'
import Swiper from 'swiper'
import { Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import powerIcon from '../assets/images/power.png'

// Crypto icons from assets/crypto_new (same as PayoutScreen/PaymentOptionsScreen)
const cryptoIconModules = import.meta.glob('../assets/crypto_new/*.png', { eager: true, query: '?url', import: 'default' })
function getCryptoIconUrl(iconId) {
  const key = Object.keys(cryptoIconModules).find((path) => path.endsWith(`/${iconId}.png`))
  return key ? cryptoIconModules[key] : `/assets/crypto_new/${iconId}.png`
}
const INVESTMENT_CRYPTO_ICONS = ['30', '130', '90', '235']
import arrowRightIcon from '../assets/images/arrow-right.png'
import arrowLeftIcon from '../assets/images/arrow-left.png'

export default function HomeScreen() {
  const swiperRef = useRef(null)
  const swiperInstanceRef = useRef(null)

  const updateButtonState = () => {
    if (!swiperInstanceRef.current) return

    const prevButton = document.querySelector('.custom-button-prev')
    const nextButton = document.querySelector('.custom-button-next')

    if (prevButton && nextButton) {
      if (swiperInstanceRef.current.isBeginning) {
        prevButton.style.display = 'none'
      } else {
        prevButton.style.display = 'block'
      }

      if (swiperInstanceRef.current.isEnd) {
        nextButton.style.display = 'none'
      } else {
        nextButton.style.display = 'block'
      }
    }
  }

  useEffect(() => {
    // Initialize Swiper
    if (swiperRef.current && !swiperInstanceRef.current) {
      swiperInstanceRef.current = new Swiper(swiperRef.current, {
        modules: [Navigation],
        spaceBetween: 30,
        slidesPerView: 1,
        speed: 500,
        navigation: {
          nextEl: '.custom-button-next',
          prevEl: '.custom-button-prev',
        },
        on: {
          slideChange: updateButtonState,
        },
      })

      // Initialize button state
      updateButtonState()
    }

    return () => {
      if (swiperInstanceRef.current) {
        swiperInstanceRef.current.destroy()
        swiperInstanceRef.current = null
      }
    }
  }, [])

  const handleTelegramLink = (e) => {
    e.preventDefault()
    const botUrl = 'https://t.me/wspin_bot'

    // Use Telegram WebApp API to open link in the same window
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(botUrl)
    } else {
      // Fallback for non-Telegram environments (browser)
      window.location.href = botUrl
    }
  }

  return (
    <div className="bg">
      <main>
        <section className="hero container">
          <div className="hero__container">
            <h1 className="hero__title">Win Spin</h1>
            <a href="#" className="hero__link">Official Telegram App</a>
            <div className="swiper" ref={swiperRef}>
              <div className="swiper-wrapper">
                <div className="swiper-slide">
                  <div className="swiper-img">
                    <video autoPlay muted loop playsInline className="hero__image">
                      <source src="https://rufus-api.biz/win_spin/miner_index_page.mp4" type="video/mp4" />
                    </video>
                  </div>
                </div>
              </div>
              <div className="custom-button-next">
                <img
                  className="hero__arrow-icon"
                  src={arrowRightIcon}
                  alt="Next"
                  width="13"
                  height="22"
                />
              </div>
              <div className="custom-button-prev">
                <img
                  className="hero__arrow-icon"
                  src={arrowLeftIcon}
                  alt="Prev"
                  width="13"
                  height="22"
                />
              </div>
            </div>
            <button className="hero__gradient-border" onClick={handleTelegramLink}>
              <span className="hero__button">
                <img
                  src={powerIcon}
                  alt="power"
                  className="hero__button-icon"
                  width="25"
                  height="25"
                />
                <span className="tg-link__button">START SPINNING</span>
              </span>
            </button>
          </div>
        </section>

        <section className="investment-info container">
          <div className="investment-info__content">
            <p className="investment-info__text">Minimum deposit - 50 Stars</p>
            <p className="investment-info__text">Minimum withdrawal - 15 Stars</p>
            <p className="investment__text">
              Use Telegram in-app virtual currency.
            </p>
            <div className="investment-info__icons">
              {INVESTMENT_CRYPTO_ICONS.map((iconId) => (
                <img
                  key={iconId}
                  className="investment-info__icon"
                  src={getCryptoIconUrl(iconId)}
                  alt=""
                  width="41"
                  height="41"
                />
              ))}
            </div>
          </div>
        </section>

        <div className="container footer">
          <a href="#" className="tg-link__button" onClick={handleTelegramLink}>
            Start Spinning
          </a>
          <p>© 2026 Win Spin. All rights reserved worldwide.</p>
        </div>
      </main>
    </div>
  )
}

