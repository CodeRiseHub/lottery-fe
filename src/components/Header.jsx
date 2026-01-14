import { useState } from 'react'
import usdIcon from '../assets/images/header/usd.png'
import gearIcon from '../assets/images/header/gear-icon.png'
import enLangIcon from '../assets/images/lang/en.png'
import ruLangIcon from '../assets/images/lang/ru.png'
import deLangIcon from '../assets/images/lang/de.png'
import itLangIcon from '../assets/images/lang/it.png'
import nlLangIcon from '../assets/images/lang/nl.png'
import plLangIcon from '../assets/images/lang/pl.png'
import frLangIcon from '../assets/images/lang/fr.png'
import esLangIcon from '../assets/images/lang/es.png'
import idLangIcon from '../assets/images/lang/id.png'
import trLangIcon from '../assets/images/lang/tr.png'
import backIcon from '../assets/images/back.png'

const languages = [
  { code: 'EN', icon: enLangIcon, name: 'English' },
  { code: 'RU', icon: ruLangIcon, name: 'Русский' },
  { code: 'DE', icon: deLangIcon, name: 'Deutsch' },
  { code: 'IT', icon: itLangIcon, name: 'Italiano' },
  { code: 'NL', icon: nlLangIcon, name: 'Nederlands' },
  { code: 'PL', icon: plLangIcon, name: 'Polski' },
  { code: 'FR', icon: frLangIcon, name: 'Français' },
  { code: 'ES', icon: esLangIcon, name: 'Español' },
  { code: 'ID', icon: idLangIcon, name: 'Indonesian' },
  { code: 'TR', icon: trLangIcon, name: 'Türkçe' }
]

export default function Header({ onNavigate }) {
  const [showLangModal, setShowLangModal] = useState(false)
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)
  const [showAccountDetail, setShowAccountDetail] = useState(false)
  const [currentLang, setCurrentLang] = useState('EN')
  const [balance, setBalance] = useState('0.0000')

  const currentLangData = languages.find(l => l.code === currentLang) || languages[0]

  const openModal = (modalName) => {
    if (typeof window.openModal === 'function') {
      window.openModal(modalName)
    } else {
      // Fallback
      if (modalName === 'langModal') {
        setShowLangModal(true)
        document.body.style.overflow = 'hidden'
      } else if (modalName === 'headerMenu') {
        setShowHeaderMenu(true)
        document.body.style.overflow = 'hidden'
      }
    }
  }

  const closeModal = (modalName) => {
    if (typeof window.closeModal === 'function') {
      window.closeModal(modalName)
    } else {
      // Fallback
      if (modalName === 'langModal') {
        setShowLangModal(false)
      } else if (modalName === 'headerMenu') {
        setShowHeaderMenu(false)
      } else if (modalName === 'accountDetail') {
        setShowAccountDetail(false)
      }
      document.body.style.overflow = 'auto'
    }
  }

  const switchModal = (fromModal, toModal) => {
    if (typeof window.switchModal === 'function') {
      window.switchModal(fromModal, toModal)
    } else {
      // Fallback
      closeModal(fromModal)
      if (toModal === 'accountDetail') {
        setShowAccountDetail(true)
        document.body.style.overflow = 'hidden'
      } else {
        openModal(toModal)
      }
    }
  }

  const handleLangSelect = (langCode) => {
    setCurrentLang(langCode)
    closeModal('langModal')
    // TODO: Implement language change API call
  }

  return (
    <>
      <header className="header" id="myBestHeader">
        <div className="header__container container">
          <div className="header__balance">
            <img
              src={usdIcon}
              alt="USD"
              className="header__icon"
              width="35"
              height="34"
            />
            <a href="#">
              <p className="header__value">
                <span id="balance_top">{balance}</span>{' '}
                <span className="header__currency">USD</span>
              </p>
            </a>
          </div>

          <button
            className="header__lang-button"
            onClick={() => openModal('langModal')}
          >
            <img
              src={currentLangData.icon}
              alt="lang"
              className="header__lang-icon"
              width="45"
              height="37"
            />
          </button>

          <button
            className="header__settings-button"
            onClick={() => openModal('headerMenu')}
          >
            <img
              src={gearIcon}
              alt="settings"
              className="header__settings-icon"
              width="36"
              height="36"
            />
          </button>
        </div>
      </header>

      {/* Language Modal */}
      <div
        className="layout"
        data-modal="langModal"
        onClick={(e) => {
          if (e.target.classList.contains('layout')) {
            closeModal('langModal')
          }
        }}
      >
          <div className="modal modal--language-menu">
            <p className="modal__title">Interface language:</p>
            <ul className="modal__language-list" id="setLangQ">
              {languages.map((lang) => (
                <li
                  key={lang.code}
                  className="modal__language-item"
                  data-lang={lang.code}
                  onClick={() => handleLangSelect(lang.code)}
                >
                  <img
                    src={lang.icon}
                    alt={lang.code}
                    width="45"
                    height="36"
                    className="modal__language-icon"
                  />
                  <p className="modal__language-name">{lang.name}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

      {/* Header Menu Modal */}
      <div
        className="layout"
        data-modal="headerMenu"
        onClick={(e) => {
          if (e.target.classList.contains('layout')) {
            closeModal('headerMenu')
          }
        }}
      >
          <div className="modal modal__header--menu">
            <ul className="modal__header--menu__list">
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    closeModal('headerMenu')
                    if (onNavigate) onNavigate('faq')
                  }}
                >
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    closeModal('headerMenu')
                    if (onNavigate) onNavigate('support')
                  }}
                >
                  Support
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    switchModal('headerMenu', 'accountDetail')
                  }}
                >
                  Account details
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    closeModal('headerMenu')
                    if (onNavigate) onNavigate('referral')
                  }}
                >
                  Referral program
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    closeModal('headerMenu')
                    if (onNavigate) onNavigate('transactionHistory')
                  }}
                >
                  Transaction history
                </a>
              </li>
            </ul>
          </div>
        </div>

      {/* Account Detail Modal */}
      <div
        className="layout"
        data-modal="accountDetail"
        onClick={(e) => {
          if (e.target.classList.contains('layout')) {
            closeModal('accountDetail')
          }
        }}
      >
          <div className="modal modal__account-detail">
            <p className="modal__account-detail-title">Information about account</p>
            <div className="relative">
              <div className="modal__account-detail-info">
                <div className="modal__account-detail-item">
                  <p className="modal__account-detail-label">ID on the project:</p>
                  <p className="modal__account-detail-value">-</p>
                </div>
                <div className="modal__account-detail-item">
                  <p className="modal__account-detail-label">Name:</p>
                  <p className="modal__account-detail-value">-</p>
                </div>
                <div className="modal__account-detail-item">
                  <p className="modal__account-detail-label">Registered:</p>
                  <p className="modal__account-detail-value">-</p>
                </div>
                <div className="modal__account-detail-item">
                  <p className="modal__account-detail-label">Balance (USD):</p>
                  <p className="modal__account-detail-value">{balance}</p>
                </div>
                <button
                  onClick={() => switchModal('accountDetail', 'headerMenu')}
                  className="modal__back-button"
                >
                  Back
                  <img src={backIcon} alt="back" width="29" height="21" />
                </button>
              </div>
            </div>
          </div>
        </div>
    </>
  )
}

