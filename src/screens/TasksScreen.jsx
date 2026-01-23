import { useState, useEffect } from 'react'
import { initTabs } from '../utils/tabs'
import { fetchTasks, claimTask, fetchCurrentUser } from '../api'
import friendIcon from '../assets/images/friend.png'
import storeIcon from '../assets/images/tasks/store.png'
import infoChannelIcon from '../assets/info_channel.png'

export default function TasksScreen({ onBack, onNavigate, onBalanceUpdate, onUserDataUpdate }) {
  const [activeTab, setActiveTab] = useState('referral')
  const [referralTasks, setReferralTasks] = useState([])
  const [followTasks, setFollowTasks] = useState([])
  const [otherTasks, setOtherTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [claimingTaskId, setClaimingTaskId] = useState(null)

  // Fetch tasks when tab changes
  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true)
      try {
        if (activeTab === 'referral') {
          const tasks = await fetchTasks('referral')
          setReferralTasks(tasks || [])
        } else if (activeTab === 'follow') {
          const tasks = await fetchTasks('follow')
          setFollowTasks(tasks || [])
        } else if (activeTab === 'other') {
          const tasks = await fetchTasks('other')
          setOtherTasks(tasks || [])
        }
      } catch (error) {
        // Handle error silently
        if (activeTab === 'referral') {
          setReferralTasks([])
        } else if (activeTab === 'follow') {
          setFollowTasks([])
        } else if (activeTab === 'other') {
          setOtherTasks([])
        }
      } finally {
        setLoading(false)
      }
    }

    loadTasks()
  }, [activeTab])

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

  const handleCheckTask = async (taskId) => {
    if (claimingTaskId === taskId) return // Prevent double-click
    
    setClaimingTaskId(taskId)
    try {
      const response = await claimTask(taskId)
      
      if (response.success) {
        // Fetch updated user data to get new balance
        const userData = await fetchCurrentUser()
        if (userData) {
          // Update userData in App.jsx so Header and other screens have the latest data
          if (onUserDataUpdate) {
            onUserDataUpdate(userData)
          }
          
          // Format balance for display (balanceA is in bigint format)
          if (onBalanceUpdate) {
            const balanceDisplay = (userData.balanceA / 1_000_000).toFixed(4)
            onBalanceUpdate(balanceDisplay)
          }
        }
        
        // Reload tasks to update claimed status
        if (activeTab === 'referral') {
          const tasks = await fetchTasks('referral')
          setReferralTasks(tasks || [])
        } else if (activeTab === 'follow') {
          const tasks = await fetchTasks('follow')
          setFollowTasks(tasks || [])
        } else if (activeTab === 'other') {
          const tasks = await fetchTasks('other')
          setOtherTasks(tasks || [])
        }
        // Close modal
        if (typeof window.closeModal === 'function') {
          document.querySelectorAll('[data-modal^="task"]').forEach(modal => {
            const modalId = modal.getAttribute('data-modal')
            if (modalId) {
              window.closeModal(modalId)
            }
          })
        }
      } else {
        // Task not completed or already claimed
        alert(response.message || 'Task cannot be claimed. Make sure the task is completed.')
      }
    } catch (error) {
      alert('Failed to claim task. Please try again.')
    } finally {
      setClaimingTaskId(null)
    }
  }

  // Helper to extract friends count from title (e.g., "Invite 15 friends" -> 15)
  const getFriendsCount = (title) => {
    const match = title.match(/Invite (\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  // Helper to format reward amount from bigint to display format
  const formatRewardAmount = (rewardAmount) => {
    if (!rewardAmount) return '0'
    // Convert from bigint (divide by 1,000,000)
    return (rewardAmount / 1_000_000).toString()
  }

  // Helper to build progress string for tasks
  // Returns null for Tasks Screen (to show Check button), but returns progress string for modals
  const buildProgressString = (task, forModal = false) => {
    if (task.claimed) {
      return 'CLAIMED'
    }
    
    if (task.progress) {
      // Backend provided progress string (for referral tasks)
      return task.progress
    }
    
    if (task.type === 'other' && task.currentValue != null) {
      // For other tasks, only show progress in modal, not on Tasks Screen
      if (!forModal) {
        return null // Show "Check" button on Tasks Screen
      }
      // In modal, convert bigint values to Tickets for display
      const currentTickets = task.currentValue / 1_000_000
      const requirementTickets = task.requirement / 1_000_000
      return `${currentTickets} / ${requirementTickets}`
    }
    
    // For follow tasks or if no progress available, return null to show Check button
    return null
  }

  // Helper to calculate progress percentage for progress bar
  const calculateProgressPercentage = (task) => {
    if (task.claimed || !task.currentValue || task.currentValue === 0) {
      return 0
    }
    
    if (task.type === 'other' && task.requirement) {
      // For other tasks, requirement and currentValue are in bigint
      const percentage = (task.currentValue / task.requirement) * 100
      return Math.min(percentage, 100) // Cap at 100%
    }
    
    if (task.type === 'referral' && task.requirement) {
      // For referral tasks, requirement is int, currentValue is long
      const percentage = (task.currentValue / task.requirement) * 100
      return Math.min(percentage, 100) // Cap at 100%
    }
    
    return 0
  }

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
              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
              ) : referralTasks.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>No tasks found</div>
              ) : (
                referralTasks.map((task) => {
                  const friends = getFriendsCount(task.title)
                  const modalId = `taskInviteModal_${task.id}`
                  return (
                    <div
                      key={task.id}
                      className="invite__container"
                      onClick={() => handleTaskClick(modalId)}
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
                          <p className="invite__title invite__title-one">{task.title}</p>
                          <p className="invite__reward">+{formatRewardAmount(task.rewardAmount)} {task.rewardType}</p>
                        </div>
                        <div className="invite__progress" id={`progSList_${task.id}`}>
                          {task.progress}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}

              {/* Modals for referral tasks */}
              {referralTasks.map((task) => {
                const friends = getFriendsCount(task.title)
                const modalId = `taskInviteModal_${task.id}`
                return (
                  <div
                    key={`modal_${task.id}`}
                    className="layout task__layout"
                    data-modal={modalId}
                    onClick={(e) => {
                      if (e.target.classList.contains('layout')) {
                        if (typeof window.closeModal === 'function') {
                          window.closeModal(modalId)
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
                        <p className="invite__title invite__title-one">{task.title}</p>
                      </div>

                      <p className="task__description">
                        {task.description || `${task.title} using your unique referral link`}
                      </p>
                      {(() => {
                        const progressText = buildProgressString(task, true) // true = for modal
                        const progressPercentage = calculateProgressPercentage(task)
                        return progressText ? (
                          <div className="task__progress-wrapper">
                            <span className="task__progress-border" style={{ width: '100%' }}>
                              <span className="task__progress" style={{ width: `${progressPercentage}%` }}></span>
                            </span>
                            <p className="task__progress-count">{progressText}</p>
                          </div>
                        ) : null
                      })()}

                      <p className="task__reward">Reward: {formatRewardAmount(task.rewardAmount)} {task.rewardType}</p>

                      <div className="task__actions">
                        <button
                          className="task__button task__button-one"
                          id="openRefPage"
                          onClick={handleInviteClick}
                        >
                          <span>Invite</span>
                        </button>
                        <button 
                          className={`task__button task__button-two ${task.claimed ? 'task__button-claimed' : ''}`}
                          id={`task_id_${task.id}`}
                          onClick={() => handleCheckTask(task.id)}
                          disabled={task.claimed || claimingTaskId === task.id}
                        >
                          <span>{task.claimed ? 'CLAIMED' : (claimingTaskId === task.id ? 'Checking...' : 'Check')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="tabs__content" data-tab-content="follow" hidden={activeTab !== 'follow'}>
            <div className="tabs__content--follow">
              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
              ) : followTasks.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>No tasks found</div>
              ) : (
                followTasks.map((task) => {
                  const modalId = `taskFollowModal_${task.id}`
                  return (
                    <div
                      key={task.id}
                      className="invite__container"
                      onClick={() => handleTaskClick(modalId)}
                    >
                      <div className="invite__card">
                        <div className="invite__icon-wrapper">
                          <img
                            src={infoChannelIcon}
                            alt="friend"
                            width="47"
                            height="47"
                            className="invite__icon-news"
                          />
                        </div>
                        <div className="invite__info">
                          <p className="invite__title invite__title-two">{task.title}</p>
                          <p className="invite__reward">+{formatRewardAmount(task.rewardAmount)} {task.rewardType}</p>
                        </div>
                        {(() => {
                          const progressText = buildProgressString(task)
                          return progressText ? (
                            <div className="invite__progress" id={`progSList_${task.id}`}>
                              {progressText}
                            </div>
                          ) : (
                            <button className="invite__progress invite__progress-button" id={`progSList_${task.id}`}>
                              Check
                            </button>
                          )
                        })()}
                      </div>
                    </div>
                  )
                })
              )}

              {/* Modals for follow tasks */}
              {followTasks.map((task) => {
                const modalId = `taskFollowModal_${task.id}`
                return (
                  <div
                    key={`modal_${task.id}`}
                    className="layout task__layout"
                    data-modal={modalId}
                    onClick={(e) => {
                      if (e.target.classList.contains('layout')) {
                        if (typeof window.closeModal === 'function') {
                          window.closeModal(modalId)
                        }
                      }
                    }}
                  >
                    <div className="modal modal__task--menu modal--bottom task__modal">
                      <div className="task__header">
                        <div className="invite__icon-wrapper">
                          <img
                            src={infoChannelIcon}
                            alt="friend"
                            width="47"
                            height="47"
                            className="invite__icon-news"
                          />
                        </div>
                        <p className="invite__title invite__title-two">{task.title}</p>
                      </div>
                      <p className="task__description">{task.description || task.title}</p>
                      <p className="task__reward">Reward: {formatRewardAmount(task.rewardAmount)} {task.rewardType}</p>
                      <div className="task__actions">
                        <button className="task__button task__button-one openLink" data-url="https://t.me/lottery_2026_test_channel">
                          <span>Join</span>
                        </button>
                        <button 
                          className={`task__button task__button-two ${task.claimed ? 'task__button-claimed' : ''}`}
                          id={`task_id_${task.id}`}
                          onClick={() => handleCheckTask(task.id)}
                          disabled={task.claimed || claimingTaskId === task.id}
                        >
                          <span>{task.claimed ? 'CLAIMED' : (claimingTaskId === task.id ? 'Checking...' : 'Check')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="tabs__content" data-tab-content="other" hidden={activeTab !== 'other'}>
            <div className="tabs__content--other">
              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
              ) : otherTasks.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>No tasks found</div>
              ) : (
                otherTasks.map((task) => {
                  const modalId = `taskInviteModal_${task.id}`
                  return (
                    <div
                      key={task.id}
                      className="invite__container"
                      onClick={() => handleTaskClick(modalId)}
                    >
                      <div className="invite__card">
                        <div className="invite__icon-wrapper">
                          <img
                            src={storeIcon}
                            alt="task"
                            width="46"
                            height="36"
                            className="invite__icon"
                          />
                        </div>
                        <div className="invite__info">
                          <p className="invite__title invite__title-one">{task.title}</p>
                          <p className="invite__reward">+{formatRewardAmount(task.rewardAmount)} {task.rewardType}</p>
                        </div>
                        {(() => {
                          const progressText = buildProgressString(task)
                          return progressText ? (
                            <div className="invite__progress" id={`progSList_${task.id}`}>
                              {progressText}
                            </div>
                          ) : (
                            <button className="invite__progress invite__progress-button" id={`progSList_${task.id}`}>
                              Check
                            </button>
                          )
                        })()}
                      </div>
                    </div>
                  )
                })
              )}

              {/* Modals for other tasks */}
              {otherTasks.map((task) => {
                const modalId = `taskInviteModal_${task.id}`
                return (
                  <div
                    key={`modal_${task.id}`}
                    className="layout task__layout"
                    data-modal={modalId}
                    onClick={(e) => {
                      if (e.target.classList.contains('layout')) {
                        if (typeof window.closeModal === 'function') {
                          window.closeModal(modalId)
                        }
                      }
                    }}
                  >
                    <div className="modal modal__task--menu modal--bottom task__modal">
                      <div className="task__header">
                        <div className="invite__icon-wrapper task__icon-wrapper">
                          <img
                            src={storeIcon}
                            alt="task"
                            width="46"
                            height="36"
                            className="invite__icon task__icon"
                          />
                        </div>
                        <p className="invite__title invite__title-one">{task.title}</p>
                      </div>

                      <p className="task__description">{task.description || task.title}</p>
                      {(() => {
                        const progressText = buildProgressString(task, true) // true = for modal
                        const progressPercentage = calculateProgressPercentage(task)
                        return progressText ? (
                          <div className="task__progress-wrapper">
                            <span className="task__progress-border" style={{ width: '100%' }}>
                              <span className="task__progress" style={{ width: `${progressPercentage}%` }}></span>
                            </span>
                            <p className="task__progress-count">{progressText}</p>
                          </div>
                        ) : null
                      })()}
                      <p className="task__reward">Reward: {formatRewardAmount(task.rewardAmount)} {task.rewardType}</p>

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
                              window.closeModal(modalId)
                            }
                          }}
                        >
                          <span>Open</span>
                        </button>
                        <button 
                          className={`task__button task__button-two ${task.claimed ? 'task__button-claimed' : ''}`}
                          id={`task_id_${task.id}`}
                          onClick={() => handleCheckTask(task.id)}
                          disabled={task.claimed || claimingTaskId === task.id}
                        >
                          <span>{task.claimed ? 'CLAIMED' : (claimingTaskId === task.id ? 'Checking...' : 'Check')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


