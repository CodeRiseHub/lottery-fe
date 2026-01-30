import { useState, useEffect, useRef } from 'react'
import ticketIcon from '../assets/images/header/ticket_1.png'
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
import { formatBalance } from '../utils/balanceFormatter'
import { t, changeLanguage, initLanguage, getCurrentLanguage } from '../i18n'
import { updateLanguage as updateLanguageAPI } from '../api'

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

export default function Header({ onNavigate, balance: balanceProp, onBalanceUpdate, userData, onLanguageChange }) {
  const [showLangModal, setShowLangModal] = useState(false)
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)
  const [showAccountDetail, setShowAccountDetail] = useState(false)
  const [currentLang, setCurrentLang] = useState('EN')
  const [balance, setBalance] = useState('0.00')
  const [languageInitialized, setLanguageInitialized] = useState(false)
  const initializedRef = useRef(false)

  // Initialize language from userData
  useEffect(() => {
    if (!languageInitialized && userData && userData.languageCode) {
      const lang = initLanguage(userData.languageCode)
      setCurrentLang(lang)
      setLanguageInitialized(true)
    } else if (!languageInitialized) {
      // Initialize with default if no userData yet
      const lang = initLanguage(null)
      setCurrentLang(lang)
      setLanguageInitialized(true)
    }
  }, [userData, languageInitialized])

  // Initialize balance from userData only once on mount
  useEffect(() => {
    if (!initializedRef.current && userData && userData.balanceA !== undefined) {
      // Only set from userData on initial load
      const formatted = formatBalance(userData.balanceA)
      setBalance(formatted)
      initializedRef.current = true
    }
  }, [userData]) // Only depend on userData

  // Update balance from balanceProp (from WebSocket updates or deposit) - always prioritize this
  useEffect(() => {
    if (balanceProp !== undefined && balanceProp !== null && balanceProp !== '') {
      // balanceProp is already formatted string from MainScreen/App/StoreScreen
      // Always prioritize balanceProp over userData for updates
      setBalance(balanceProp)
      initializedRef.current = true // Mark as initialized once we get a balanceProp update
    } else if (initializedRef.current && userData && userData.balanceA !== undefined) {
      // Fallback: if balanceProp is not available but userData is updated, use userData
      const formatted = formatBalance(userData.balanceA)
      if (formatted !== balance) {
        setBalance(formatted)
      }
    }
  }, [balanceProp, userData, balance]) // Depend on both balanceProp and userData

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

  const handleLangSelect = async (langCode) => {
    try {
      // First, update backend language preference (so backend uses new language for subsequent API calls)
      await updateLanguageAPI(langCode)
      
      // Then update language in i18n system (this triggers listeners, which may refetch data)
      changeLanguage(langCode)
      setCurrentLang(langCode)
      
      // Notify parent component to reload user data
      if (onLanguageChange) {
        onLanguageChange(langCode)
      }
      
      closeModal('langModal')
    } catch (error) {
      console.error('Failed to update language:', error)
      // Still update UI even if API call fails
      changeLanguage(langCode)
      setCurrentLang(langCode)
      closeModal('langModal')
    }
  }

  // Format registration date from Unix timestamp (seconds) to dd.MM at HH:mm
  const formatRegistrationDate = (dateReg) => {
    if (!dateReg || dateReg === 0) return '-'
    const date = new Date(dateReg * 1000) // Convert seconds to milliseconds
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${day}.${month} at ${hours}:${minutes}`
  }

  return (
    <>
      <header className="header" id="myBestHeader">
        <div className="header__container container">
          <div className="header__balance">
            <img
              src={ticketIcon}
              alt="Star"
              className="header__icon"
              width="35"
              height="34"
            />
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                if (onNavigate) onNavigate('store')
              }}
            >
              <p className="header__value">
                <span id="balance_top">{balance}</span>
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
            <p className="modal__title">{t('header.language.title')}</p>
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
                  {t('header.menu.faq')}
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
                  {t('header.menu.support')}
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
                  {t('header.menu.accountDetails')}
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
                  {t('header.menu.referral')}
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
                  {t('header.menu.transactionHistory')}
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
            <p className="modal__account-detail-title">{t('header.menu.accountDetails')}</p>
            <div className="relative">
              <div className="modal__account-detail-info">
                <div className="modal__account-detail-item">
                  <p className="modal__account-detail-label">{t('header.account.id')}</p>
                  <p className="modal__account-detail-value">{userData?.id || '-'}</p>
                </div>
                <div className="modal__account-detail-item">
                  <p className="modal__account-detail-label">{t('header.account.name')}</p>
                  <p className="modal__account-detail-value">{userData?.screenName || '-'}</p>
                </div>
                <div className="modal__account-detail-item">
                  <p className="modal__account-detail-label">{t('header.account.registered')}</p>
                  <p className="modal__account-detail-value">
                    {userData?.dateReg ? formatRegistrationDate(userData.dateReg) : '-'}
                  </p>
                </div>
                <div className="modal__account-detail-item">
                  <p className="modal__account-detail-label">{t('header.account.balance')}</p>
                  <p className="modal__account-detail-value">{balance}</p>
                </div>
                <button
                  onClick={() => switchModal('accountDetail', 'headerMenu')}
                  className="modal__back-button"
                >
                  {t('header.account.back')}
                  <img src={backIcon} alt="back" width="29" height="21" />
                </button>
              </div>
            </div>
          </div>
        </div>
    </>
  )
}

