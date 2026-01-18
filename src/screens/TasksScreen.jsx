import { useState, useEffect } from 'react'
import { initTabs } from '../utils/tabs'
import friendIcon from '../assets/images/friend.png'
import storeIcon from '../assets/images/tasks/store.png'
import infoChannelIcon from '../assets/info_channel.png'

export default function TasksScreen({ onBack, onNavigate }) {
  const [activeTab, setActiveTab] = useState('referral')

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
      setTimeout(() => {
        const tabsBlock = document.querySelector('[data-tabs]')
        if (!tabsBlock) return
        
        const nav = tabsBlock.querySelector('[data-tabs-nav]')
        if (!nav) return
        
        const tabButtons = nav.querySelectorAll('[data-tab-target]')
        const activeBg = nav.querySelector('.tabs__active-position')
        
        if (!activeBg) return
        
        const activeIndex = Array.from(tabButtons).findIndex(btn => {
          const target = btn.getAttribute('data-tab-target')
          return target === activeTab
        })
        
        if (activeIndex >= 0) {
          const tabCount = tabButtons.length
          const offset = activeIndex * (300 / tabCount)
          activeBg.style.transform = `translateX(${offset}%)`
        }
      }, 100)
    }
  }, [activeTab])

  const handleTaskClick = (modalId) => {
    if (typeof window.openModal === 'function') {
      window.openModal(modalId)
    }
  }

  const handleInviteClick = () => {
    // Navigate to referral screen
    if (onNavigate) {
      onNavigate('referral')
    }
    // Close modal
    if (typeof window.closeModal === 'function') {
      // Close all task modals
      document.querySelectorAll('[data-modal^="task"]').forEach(modal => {
        const modalId = modal.getAttribute('data-modal')
        if (modalId) {
          window.closeModal(modalId)
        }
      })
    }
  }

  const referralTasks = [
    { id: 1, friends: 1, reward: '2 Stars', progress: '1008 / 1', modalId: 'taskInviteModal_1' },
    { id: 2, friends: 3, reward: '5 Stars', progress: '1008 / 3', modalId: 'taskInviteModal_2' },
    { id: 3, friends: 7, reward: '15 Stars', progress: '1008 / 7', modalId: 'taskInviteModal_3' },
    { id: 4, friends: 15, reward: '25 Stars', progress: '1008 / 15', modalId: 'taskInviteModal_4' },
    { id: 5, friends: 30, reward: '40 Stars', progress: '1008 / 30', modalId: 'taskInviteModal_5' },
    { id: 6, friends: 50, reward: '60 Stars', progress: '1008 / 50', modalId: 'taskInviteModal_6' },
    { id: 7, friends: 100, reward: '150 Stars', progress: '1008 / 100', modalId: 'taskInviteModal_7' }
  ]

  const followTasks = [
    {
      id: 12,
      title: 'Follow our News channel',
      description: 'Follow our News channel',
      reward: '5 Stars',
      url: 'https://t.me/SecretMinerInfo',
      modalId: 'taskFollowModal_12',
      icon: infoChannelIcon
    }
  ]

  const otherTasks = [
    {
      id: 11,
      title: 'Top Up Balance: $5',
      description: 'Top Up Balance: $5',
      reward: '100 Stars',
      progress: null, // Will show "Check" button instead
      url: '/account/speed_up?unlock=5',
      modalId: 'taskInviteModal_11'
    }
  ]

  return (
    <section>
      <div className="container">
        <p className="title">Tasks</p>
        <div className="tabs" data-tabs>
          <ul className="tabs__nav" data-tabs-nav id="tabsNav">
            <li
              data-tab-target="referral"
              className={activeTab === 'referral' ? 'active' : ''}
              onClick={() => setActiveTab('referral')}
            >
              <span>Referral</span>
            </li>
            <li
              data-tab-target="follow"
              className={activeTab === 'follow' ? 'active' : ''}
              onClick={() => setActiveTab('follow')}
            >
              <span>Follow</span>
            </li>
            <li
              data-tab-target="other"
              className={activeTab === 'other' ? 'active' : ''}
              onClick={() => setActiveTab('other')}
            >
              <span>Other</span>
            </li>
            <div className="tabs__active-border tabs__active-position">
              <span className="tabs__active-bg tabs__active-position"></span>
            </div>
          </ul>

          <div className="tabs__content" data-tab-content="referral" hidden={activeTab !== 'referral'}>
            <div className="tabs__content--refferal">
              {referralTasks.map((task) => (
                <div
                  key={task.id}
                  className="invite__container"
                  onClick={() => handleTaskClick(task.modalId)}
                >
                  <div className="invite__card">
                    <div className="invite__icon-wrapper">
                      <img
                        src={friendIcon}
                        alt="friend"
                        width="46"
                        height="36"
                        className="invite__icon"
                      />
                    </div>
                    <div className="invite__info">
                      <p className="invite__title invite__title-one">Invite {task.friends} friend{task.friends > 1 ? 's' : ''}</p>
                      <p className="invite__reward">+{task.reward}</p>
                    </div>
                    <div className="invite__progress" id={`progSList_${task.id}`}>
                      {task.progress}
                    </div>
                  </div>
                </div>
              ))}

              {/* Modals for referral tasks */}
              {referralTasks.map((task) => (
                <div
                  key={`modal_${task.id}`}
                  className="layout task__layout"
                  data-modal={task.modalId}
                  onClick={(e) => {
                    if (e.target.classList.contains('layout')) {
                      if (typeof window.closeModal === 'function') {
                        window.closeModal(task.modalId)
                      }
                    }
                  }}
                >
                  <div className="modal modal__task--menu modal--bottom task__modal">
                    <div className="task__header">
                      <div className="invite__icon-wrapper task__icon-wrapper">
                        <img
                          src={friendIcon}
                          alt="friend"
                          width="46"
                          height="36"
                          className="invite__icon task__icon"
                        />
                      </div>
                      <p className="invite__title invite__title-one">Invite {task.friends} friend{task.friends > 1 ? 's' : ''}</p>
                    </div>

                    <p className="task__description">
                      Invite {task.friends} friend{task.friends > 1 ? 's' : ''} using your unique referral link
                    </p>
                    <div className="task__progress-wrapper">
                      <span className="task__progress-border" style={{ width: '100%' }}>
                        <span className="task__progress"></span>
                      </span>
                      <p className="task__progress-count">{task.progress}</p>
                    </div>

                    <p className="task__reward">Reward: {task.reward}</p>

                    <div className="task__actions">
                      <button
                        className="task__button task__button-one"
                        id="openRefPage"
                        onClick={handleInviteClick}
                      >
                        <span>Invite</span>
                      </button>
                      <button className="task__button task__button-two" id={`task_id_${task.id}`}>
                        <span>Check</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="tabs__content" data-tab-content="follow" hidden={activeTab !== 'follow'}>
            <div className="tabs__content--follow">
              {followTasks.map((task) => (
                <div
                  key={task.id}
                  className="invite__container"
                  onClick={() => handleTaskClick(task.modalId)}
                >
                  <div className="invite__card">
                    <div className="invite__icon-wrapper">
                      <img
                        src={task.icon}
                        alt="friend"
                        width="47"
                        height="47"
                        className="invite__icon-news"
                      />
                    </div>
                    <div className="invite__info">
                      <p className="invite__title invite__title-two">{task.title}</p>
                      <p className="invite__reward">+{task.reward}</p>
                    </div>
                    <button className="invite__progress invite__progress-button" id={`progSList_${task.id}`}>
                      Check
                    </button>
                  </div>
                </div>
              ))}

              {/* Modals for follow tasks */}
              {followTasks.map((task) => (
                <div
                  key={`modal_${task.id}`}
                  className="layout task__layout"
                  data-modal={task.modalId}
                  onClick={(e) => {
                    if (e.target.classList.contains('layout')) {
                      if (typeof window.closeModal === 'function') {
                        window.closeModal(task.modalId)
                      }
                    }
                  }}
                >
                  <div className="modal modal__task--menu modal--bottom task__modal">
                    <div className="task__header">
                      <div className="invite__icon-wrapper">
                        <img
                          src={task.icon}
                          alt="friend"
                          width="47"
                          height="47"
                          className="invite__icon-news"
                        />
                      </div>
                      <p className="invite__title invite__title-two">{task.title}</p>
                    </div>
                    <p className="task__description">{task.description}</p>
                    <p className="task__reward">Reward: {task.reward}</p>
                    <div className="task__actions">
                      <button
                        className="task__button task__button-one openLink"
                        data-url={task.url}
                        onClick={() => window.open(task.url, '_blank')}
                      >
                        <span>Join</span>
                      </button>
                      <button className="task__button task__button-two" id={`task_id_${task.id}`}>
                        <span>Check</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="tabs__content" data-tab-content="other" hidden={activeTab !== 'other'}>
            <div className="tabs__content--other">
              {otherTasks.map((task) => (
                <div
                  key={task.id}
                  className="invite__container"
                  onClick={() => handleTaskClick(task.modalId)}
                >
                  <div className="invite__card">
                    <div className="invite__icon-wrapper">
                      <img
                        src={task.icon || storeIcon}
                        alt="task"
                        width="46"
                        height="36"
                        className="invite__icon"
                      />
                    </div>
                    <div className="invite__info">
                      <p className="invite__title invite__title-one">{task.title}</p>
                      <p className="invite__reward">+{task.reward}</p>
                    </div>
                    <button className="invite__progress invite__progress-button" id={`progSList_${task.id}`}>
                      Check
                    </button>
                  </div>
                </div>
              ))}

              {/* Modals for other tasks */}
              {otherTasks.map((task) => (
                <div
                  key={`modal_${task.id}`}
                  className="layout task__layout"
                  data-modal={task.modalId}
                  onClick={(e) => {
                    if (e.target.classList.contains('layout')) {
                      if (typeof window.closeModal === 'function') {
                        window.closeModal(task.modalId)
                      }
                    }
                  }}
                >
                  <div className="modal modal__task--menu modal--bottom task__modal">
                    <div className="task__header">
                      <div className="invite__icon-wrapper task__icon-wrapper">
                        <img
                          src={task.icon || storeIcon}
                          alt="task"
                          width="46"
                          height="36"
                          className="invite__icon task__icon"
                        />
                      </div>
                      <p className="invite__title invite__title-one">{task.title}</p>
                    </div>

                    <p className="task__description">{task.description}</p>

                    <p className="task__reward">Reward: {task.reward}</p>

                    <div className="task__actions">
                      <button
                        className="task__button task__button-one"
                        onClick={() => {
                          // Navigate to Store screen
                          if (onNavigate) {
                            onNavigate('store')
                          }
                          // Close modal
                          if (typeof window.closeModal === 'function') {
                            window.closeModal(task.modalId)
                          }
                        }}
                      >
                        <span>Open</span>
                      </button>
                      <button className="task__button task__button-two" id={`task_id_${task.id}`}>
                        <span>Check</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


