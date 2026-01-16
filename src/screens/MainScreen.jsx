import { useState, useEffect, useRef } from 'react'
import infoIcon from '../assets/images/tasks/info.png'
import historyIcon from '../assets/images/tasks/history.png'
import arrowDownIcon from '../assets/images/tasks/arrow-down.png'
import defaultAvatar from '../assets/images/default.png'
import avatar1 from '../assets/avatars/avatar1.svg'
import avatar2 from '../assets/avatars/avatar2.svg'
import avatar3 from '../assets/avatars/avatar3.svg'
import RoomDropdown from '../components/RoomDropdown'
import CustomKeyboard from '../components/CustomKeyboard'
import { gameWebSocket } from '../services/gameWebSocket'
import { fetchCurrentUser } from '../api'
import { formatBalance } from '../utils/balanceFormatter'
import '../utils/modals'

export default function MainScreen({ onNavigate, onBalanceUpdate }) {
  const [currentBet, setCurrentBet] = useState(1000)
  const [gameStarted, setGameStarted] = useState(false)
  const [showRulesModal, setShowRulesModal] = useState(false)
  const [showKeyboardModal, setShowKeyboardModal] = useState(false)
  const [countdownActive, setCountdownActive] = useState(false)
  const [countdownProgress, setCountdownProgress] = useState(0)
  const [countdownRemaining, setCountdownRemaining] = useState(null)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [registeredUsers, setRegisteredUsers] = useState(0)
  const [totalTickets, setTotalTickets] = useState(0)
  const [currentRoom, setCurrentRoom] = useState({ number: 1, users: 0 })
  const [rooms, setRooms] = useState([
    { number: 1, users: 0 },
    { number: 2, users: 0 },
    { number: 3, users: 0 }
  ])
  const [userBets, setUserBets] = useState([])
  const [roomPhase, setRoomPhase] = useState('WAITING')
  const [winner, setWinner] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [userBalance, setUserBalance] = useState(0) // Balance in bigint format
  const [userTickets, setUserTickets] = useState(0) // User's tickets in current round
  const [isJoining, setIsJoining] = useState(false) // Track if user is attempting to join
  const [currentUserId, setCurrentUserId] = useState(null) // Current user ID
  const lineContainerRef = useRef(null)
  const countdownIntervalRef = useRef(null)
  const animationRunningRef = useRef(false) // Track if animation is currently running
  const animationStartTimeRef = useRef(null) // Track when animation started (for timeout)
  const animationCompletedTimeRef = useRef(null) // Track when animation completed (for state machine guards)
  // Bet limits in ticket units (for UI display)
  const minBet = 1000
  const maxBet = 1000000

  // Generate tape with empty blocks (like lottery-draft-fe but without text/avatars)
  const generateTapeHTML = (participants, stopIndex) => {
    if (!participants || participants.length === 0) {
      return '' // Return empty - will show "Waiting for users..." message
    }

    const totalTickets = participants.reduce((sum, p) => sum + p.tickets, 0)
    if (totalTickets === 0) {
      return ''
    }

    const items = []
    
    // Calculate cumulative positions for each participant
    let cumulative = 0
    const participantRanges = participants.map(p => {
      const start = cumulative
      cumulative += p.tickets
      const end = cumulative
      return { ...p, start, end }
    })

    // Generate tape items - repeat participants proportionally
    // Use enough items to ensure smooth scrolling (like lottery-draft-fe has ~100+ items)
    const totalItems = 200
    for (let i = 0; i < totalItems; i++) {
      // Map position to ticket range (all in bigint format)
      const position = (i / totalItems) * totalTickets
      
      // Find which participant this position belongs to
      const participant = participantRanges.find(p => position >= p.start && position < p.end)
      
      if (!participant) {
        // If no participant found, skip this item
        continue
      }
      
      // Mark middle item (exactly at center for animation)
      const isMiddle = i === Math.floor(totalItems / 2)
      
      // Use participant's userId to determine avatar (placeholder)
      const avatarIndex = participant.userId % 3
      const avatars = [avatar1, avatar2, avatar3]
      const avatarUrl = avatars[avatarIndex]
      
      // Create block with avatar placeholder (exactly like lottery-draft-fe structure)
      items.push(
        `<div class='spin__game-item' ${isMiddle ? "id='middleQ'" : ''}>
          <img src="${avatarUrl}" alt="avatar" width="56" height="56" style="border-radius: 50%;" />
        </div>`
      )
    }
    
    return items.join('')
  }

  // Calculate user's win chance percentage
  const calculateWinChance = () => {
    // totalTickets and userTickets are already in ticket units (converted from bigint)
    if (totalTickets === 0 || userTickets === 0) return 0
    return ((userTickets / totalTickets) * 100).toFixed(2)
  }

  // Fetch user balance and ID on mount
  useEffect(() => {
    async function fetchUserData() {
      try {
        const user = await fetchCurrentUser()
        if (user) {
          if (user.id) {
            setCurrentUserId(user.id)
          }
          if (user.balanceA !== undefined) {
            setUserBalance(user.balanceA)
            if (onBalanceUpdate) {
              onBalanceUpdate(formatBalance(user.balanceA))
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
      }
    }
    fetchUserData()
  }, [onBalanceUpdate])

  // Animation flag timeout - reset if stuck for more than 10 seconds
  useEffect(() => {
    const checkAnimationTimeout = setInterval(() => {
      if (animationRunningRef.current && animationStartTimeRef.current) {
        const elapsed = Date.now() - animationStartTimeRef.current
        if (elapsed > 10000) { // 10 seconds timeout
          console.warn('Animation flag stuck, resetting')
          animationRunningRef.current = false
          animationStartTimeRef.current = null
        }
      }
    }, 1000) // Check every second
    
    return () => clearInterval(checkAnimationTimeout)
  }, [])
  
  // RoomPhase timeout - reset if stuck in SPINNING for more than 8 seconds
  useEffect(() => {
    if (roomPhase === 'SPINNING') {
      const timeout = setTimeout(() => {
        // If still in SPINNING after 8 seconds, force transition to RESOLUTION
        // This handles cases where WebSocket message was missed
        console.warn('RoomPhase stuck in SPINNING, forcing transition')
        setRoomPhase('RESOLUTION')
      }, 8000) // 8 seconds (5000ms animation + 3000ms buffer)
      
      return () => clearTimeout(timeout)
    }
  }, [roomPhase])
  
  // WebSocket connection and state updates
  useEffect(() => {
    const roomNumber = currentRoom.number

    // Connect to WebSocket
    gameWebSocket.connect(
      roomNumber,
      (state) => {
        // Update state from server
        setRegisteredUsers(state.registeredPlayers || 0)
        // totalTickets from backend is in bigint format, convert to ticket units for display
        const totalTicketsBigint = state.totalTickets || 0
        const totalTicketsDisplay = totalTicketsBigint / 1000000
        setTotalTickets(totalTicketsDisplay)
        // Update roomPhase with state validation and synchronization
        // Ensure valid phase transitions and synchronize with winner data
        const newPhase = state.phase || 'WAITING'
        const currentPhase = roomPhase
        
        console.log('[PHASE-TRANSITION]', {
          from: currentPhase,
          to: newPhase,
          hasWinner: !!state.winner,
          participants: state.participants?.length || 0,
          animationRunning: animationRunningRef.current,
          animationCompletedTime: animationCompletedTimeRef.current,
          timeSinceCompletion: animationCompletedTimeRef.current ? Date.now() - animationCompletedTimeRef.current : null,
          timestamp: Date.now()
        })
        
        // Validate phase transition (prevent skipping phases)
        // Allow: WAITING -> COUNTDOWN -> SPINNING -> RESOLUTION -> WAITING
        // Also allow: any -> WAITING (reset)
        const validTransitions = {
          'WAITING': ['COUNTDOWN', 'WAITING'],
          'COUNTDOWN': ['SPINNING', 'WAITING'],
          'SPINNING': ['RESOLUTION', 'WAITING'],
          'RESOLUTION': ['WAITING']
        }
        
        // Synchronize phase update with winner data (atomic update)
        // If transitioning to RESOLUTION, ensure winner data is present
        if (newPhase === 'RESOLUTION' && state.winner) {
          // Update phase atomically with winner data
          console.log('[PHASE-TRANSITION] Updating to RESOLUTION with winner:', state.winner.userId)
          setRoomPhase(newPhase)
        } else if (newPhase === 'WAITING') {
          // For WAITING, check if animation just completed (state machine guard)
          const now = Date.now()
          const animationCompletedTime = animationCompletedTimeRef.current
          const timeSinceCompletion = animationCompletedTime ? now - animationCompletedTime : null
          // If animation completed less than 1 second ago, delay WAITING processing
          if (animationCompletedTime && timeSinceCompletion < 1000) {
            // Don't update to WAITING yet - animation just completed
            // This prevents race condition with tape clearing
            console.log('[PHASE-TRANSITION] BLOCKED WAITING - animation completed', timeSinceCompletion, 'ms ago')
            // Skip this state update but continue processing other state updates
          } else {
            console.log('[PHASE-TRANSITION] Allowing WAITING transition', {
              timeSinceCompletion,
              animationCompletedTime: !!animationCompletedTime
            })
            setRoomPhase(newPhase)
          }
        } else if (newPhase === 'WAITING' || (validTransitions[currentPhase] && validTransitions[currentPhase].includes(newPhase))) {
          setRoomPhase(newPhase)
        } else {
          // Invalid transition - log warning but allow it (might be due to missed messages)
          console.warn(`Invalid phase transition: ${currentPhase} -> ${newPhase}`)
          setRoomPhase(newPhase) // Still update to prevent stuck state
        }
        
        // Update room user count for all rooms (always update, even if no participants)
        if (state.roomNumber !== undefined && state.roomNumber !== null) {
          const userCount = state.registeredPlayers || 0
          setRooms(prevRooms => 
            prevRooms.map(room => 
              room.number === state.roomNumber 
                ? { ...room, users: userCount }
                : room
            )
          )
          // Also update currentRoom if it matches
          if (currentRoom.number === state.roomNumber) {
            setCurrentRoom(prev => ({ ...prev, users: userCount }))
          }
        }
        
        // Update participants and calculate user's tickets
        if (state.participants && state.participants.length > 0) {
          setUserBets(state.participants.map(p => ({
            id: p.userId,
            avatar: defaultAvatar,
            name: `User ${p.userId}`,
            tickets: p.tickets
          })))
          
          // Find current user's tickets
          // Tickets from backend are in bigint format, convert to ticket units for display
          const currentUserTicketsBigint = currentUserId 
            ? state.participants.find(p => p.userId === currentUserId)?.tickets || 0
            : 0
          const currentUserTickets = currentUserTicketsBigint / 1000000
          setUserTickets(currentUserTickets)
          
          // Update tape with participants (but NOT during SPINNING - that's handled separately)
          // Only update tape for WAITING and COUNTDOWN phases
          // Set HTML synchronously when DOM is ready (no requestAnimationFrame needed)
          if ((state.phase === 'WAITING' || state.phase === 'COUNTDOWN') && lineContainerRef.current) {
            const tapeHTML = generateTapeHTML(state.participants, state.stopIndex)
            console.log('[TAPE-GEN]', {
              phase: state.phase,
              participants: state.participants?.length || 0,
              hasHTML: !!tapeHTML,
              htmlLength: tapeHTML?.length || 0,
              containerExists: !!lineContainerRef.current,
              timestamp: Date.now()
            })
            if (tapeHTML) {
              lineContainerRef.current.innerHTML = tapeHTML
              console.log('[TAPE-GEN] HTML set successfully')
            } else {
              console.warn('[TAPE-GEN] No HTML generated, participants:', state.participants)
            }
          }
        } else {
          setUserBets([])
          setUserTickets(0)
          // Don't clear tape here - let animation callback handle it
          // Only clear if we're in WAITING phase AND animation completed more than 1 second ago
          // This prevents race condition between animation completion and WAITING state
          if (lineContainerRef.current && state.phase === 'WAITING') {
            const now = Date.now()
            const animationCompletedTime = animationCompletedTimeRef.current
            const timeSinceCompletion = animationCompletedTime ? now - animationCompletedTime : null
            
            console.log('[TAPE-CLEAR-CHECK]', {
              phase: state.phase,
              participants: state.participants?.length || 0,
              animationCompletedTime: !!animationCompletedTime,
              timeSinceCompletion,
              willClear: !animationCompletedTime || timeSinceCompletion > 1000,
              timestamp: now
            })
            
            // Only clear if animation completed more than 1 second ago, or never ran
            if (!animationCompletedTime || timeSinceCompletion > 1000) {
              console.log('[TAPE-CLEAR-CHECK] Clearing tape')
              lineContainerRef.current.innerHTML = ''
              animationCompletedTimeRef.current = null // Reset after clearing
            } else {
              console.log('[TAPE-CLEAR-CHECK] Skipping clear - animation completed', timeSinceCompletion, 'ms ago')
            }
          }
        }

        // Handle countdown - set for all users when phase is COUNTDOWN
        if (state.phase === 'COUNTDOWN' && state.countdownRemainingSeconds !== null && state.countdownRemainingSeconds !== undefined) {
          setCountdownActive(true)
          setCountdownRemaining(state.countdownRemainingSeconds)
        } else {
          setCountdownActive(false)
          setCountdownRemaining(null)
        }

        // Check if current user has joined the round
        const userHasJoined = currentUserId && state.participants && 
          state.participants.some(p => p.userId === currentUserId)

        // Handle spin - must be checked BEFORE other phases to start animation immediately
        if (state.phase === 'SPINNING') {
          setGameStarted(true)
          // Reset joining state if user has joined (they're now in the spin)
          if (userHasJoined) {
            setIsJoining(false)
          }
          
          // Only start animation if not already running (prevent interruption)
          // This prevents "quick spin" when state changes rapidly
          if (!animationRunningRef.current && lineContainerRef.current && state.participants && state.participants.length > 0) {
            // Reset scroll first (like lottery-draft-fe)
            if (typeof window.$ !== 'undefined') {
              window.$('#lineContainer').scrollLeft(0)
            }
            
            // Set HTML content immediately (synchronously, no requestAnimationFrame)
            // Ensure container exists and is mounted before setting HTML
            const animationStartTime = Date.now()
            console.log('[ANIMATION-START]', {
              participants: state.participants?.length || 0,
              stopIndex: state.stopIndex,
              containerExists: !!lineContainerRef.current,
              timestamp: animationStartTime
            })
            
            if (lineContainerRef.current) {
              const tapeHTML = generateTapeHTML(state.participants, state.stopIndex)
              console.log('[ANIMATION-START] Generated tape HTML:', {
                hasHTML: !!tapeHTML,
                htmlLength: tapeHTML?.length || 0
              })
              if (tapeHTML) {
                lineContainerRef.current.innerHTML = tapeHTML
                console.log('[ANIMATION-START] HTML set to container')
              } else {
                console.error('[ANIMATION-START] No HTML generated!')
              }
            } else {
              console.error('[ANIMATION-START] Container not found!')
            }
            
            // Mark animation as running and record start time
            animationRunningRef.current = true
            animationStartTimeRef.current = animationStartTime
            animationCompletedTimeRef.current = null // Reset completion time when starting new animation
            
            // Start animation immediately - use minimal delay to ensure DOM is ready
            setTimeout(() => {
              startSpinAnimation(state.stopIndex, state.spinDuration || 5000)
            }, 10) // Very short delay to ensure DOM is ready
          }
        } else if (state.phase === 'WAITING') {
          // Reset all game states when back to WAITING
          setGameStarted(false)
          setIsJoining(false) // Always reset joining state in WAITING
          
          // State machine guard: Don't process WAITING if animation just completed
          // This prevents race condition between animation completion and WAITING state
          const now = Date.now()
          const animationCompletedTime = animationCompletedTimeRef.current
          const timeSinceCompletion = animationCompletedTime ? now - animationCompletedTime : null
          
          console.log('[WAITING-HANDLER]', {
            animationRunning: animationRunningRef.current,
            animationCompletedTime: !!animationCompletedTime,
            timeSinceCompletion,
            participants: state.participants?.length || 0,
            timestamp: now
          })
          
          if (animationCompletedTime && timeSinceCompletion < 1000) {
            // Animation just completed (< 1 second ago), skip WAITING processing
            // Tape clearing is handled by animation callback
            console.log('[WAITING-HANDLER] BLOCKED - animation completed', timeSinceCompletion, 'ms ago')
            return // Skip this state update to prevent race condition
          }
          
          // If animation wasn't running (single participant refund), allow tape clearing
          if (!animationRunningRef.current && (!state.participants || state.participants.length === 0)) {
            console.log('[WAITING-HANDLER] Clearing tape (no animation, no participants)')
            setUserBets([])
            setUserTickets(0)
            if (lineContainerRef.current) {
              lineContainerRef.current.innerHTML = ''
            }
            animationCompletedTimeRef.current = null // Reset after clearing
          }
        } else if (state.phase === 'COUNTDOWN') {
          // During countdown, user can still join
          setGameStarted(false)
          // If user has joined, reset joining state (they're in the countdown)
          if (userHasJoined) {
            setIsJoining(false)
          }
          // If user hasn't joined yet, keep isJoining as is (they might be in the process of joining)
        } else if (state.phase === 'RESOLUTION') {
          // Reset game started state when resolution phase starts
          setGameStarted(false)
          setIsJoining(false) // Always reset joining state in resolution
          
          // Clear tape synchronously when RESOLUTION arrives if animation is still running
          // This ensures tape is cleared before winner overlay is shown
          // The animation callback will also try to clear, but this ensures it happens immediately
          if (animationRunningRef.current && lineContainerRef.current) {
            console.log('[RESOLUTION] Clearing tape synchronously (animation still running)')
            lineContainerRef.current.innerHTML = ''
            // Don't reset animationRunningRef here - let the callback do it
            // This prevents the callback from trying to clear a non-existent container
          } else if (!animationRunningRef.current && lineContainerRef.current) {
            // Animation wasn't running (single participant refund), clear immediately
            console.log('[RESOLUTION] Clearing tape (no animation)')
            lineContainerRef.current.innerHTML = ''
          }
        }

        // Handle winner
        if (state.phase === 'RESOLUTION' && state.winner) {
          setWinner(state.winner)
          // Balance update will be received via WebSocket balance update message
          // No need to manually update here - WebSocket will send the updated balance
        } else {
          setWinner(null)
        }
      },
      (error) => {
        setErrorMessage(error || 'WebSocket connection error')
        setShowErrorModal(true)
        // Don't disconnect on join errors - only on connection errors
        if (error && (error.includes('connection') || error.includes('WebSocket') || error.includes('reconnect'))) {
          setWsConnected(false)
        }
        // Reset game state on error
        setGameStarted(false)
        setIsJoining(false)
      },
      (connected) => {
        // Connection state callback
        setWsConnected(connected)
        console.log('[MainScreen] WebSocket connection state:', connected)
      },
      (balanceBigint) => {
        // Balance update callback from WebSocket
        if (balanceBigint !== null && balanceBigint !== undefined) {
          setUserBalance(balanceBigint)
          if (onBalanceUpdate) {
            onBalanceUpdate(formatBalance(balanceBigint))
          }
          console.debug('[MainScreen] Balance updated from WebSocket:', balanceBigint)
        }
      }
    )

    // Cleanup on unmount
      return () => {
        gameWebSocket.disconnect()
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
        }
      }
  }, [currentRoom.number])

  // Countdown timer
  useEffect(() => {
    if (countdownRemaining === null) {
      setCountdownProgress(0)
      return
    }

    const totalSeconds = 5 // Match backend COUNTDOWN_DURATION_SECONDS
    const updateInterval = 100 // Update every 100ms

    countdownIntervalRef.current = setInterval(() => {
      setCountdownRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(countdownIntervalRef.current)
          return 0
        }
        const newRemaining = prev - 0.1
        setCountdownProgress(((totalSeconds - newRemaining) / totalSeconds) * 100)
        return newRemaining
      })
    }, updateInterval)

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [countdownRemaining])

  const changeBet = (newBet) => {
    let bet = parseInt(newBet, 10)
    bet = bet <= minBet ? minBet : bet
    bet = bet >= maxBet ? maxBet : bet
    setCurrentBet(bet)
  }

  const handleBetChange = (action) => {
    if (action === 'min') changeBet(minBet)
    else if (action === 'max') {
      // Use actual balance
      const balanceDisplay = formatBalance(userBalance)
      const balanceValue = parseFloat(balanceDisplay) * 1000000 // Convert to bigint equivalent
      const max = Math.min(balanceValue - 1000, maxBet)
      changeBet(Math.max(minBet, max))
    }
  }

  const handleInputClick = () => {
    setShowKeyboardModal(true)
    if (typeof window.openModal === 'function') {
      window.openModal('customKeyboard')
    }
  }

  const handleKeyboardConfirm = (value) => {
    if (value && !isNaN(value) && value > 0) {
      changeBet(value)
    }
    setShowKeyboardModal(false)
    if (typeof window.closeModal === 'function') {
      window.closeModal('customKeyboard')
    }
  }

  const handleKeyboardClose = () => {
    setShowKeyboardModal(false)
    if (typeof window.closeModal === 'function') {
      window.closeModal('customKeyboard')
    }
  }

  const scrollToCenter = ($container, $element, duration, onComplete) => {
    if (typeof window.$ === 'undefined') {
      console.error('jQuery not available for scrollToCenter')
      return
    }
    
    const container = $container[0]
    const element = $element[0]
    if (!container || !element) {
      console.warn('scrollToCenter: container or element not found', { container, element })
      return
    }

    // Calculate offset exactly like lottery-draft-fe
    const offset = element.offsetLeft - (container.clientWidth / 2) + (element.clientWidth / 2)
    // Use duration parameter (defaults to 5000ms to match backend SPIN_DURATION_MS)
    const animationDuration = duration || 5000
    $container.animate({ scrollLeft: offset }, animationDuration, "swing", () => {
      // Animation completed callback
      if (onComplete) {
        onComplete()
      }
    })
  }

  const startSpinAnimation = (stopIndex, duration) => {
    if (typeof window.$ === 'undefined') {
      console.error('jQuery not loaded')
      animationRunningRef.current = false // Reset flag on error
      animationStartTimeRef.current = null
      animationCompletedTimeRef.current = null
      return
    }

    // Use scrollToCenter to center the middle item (exactly like lottery-draft-fe lineAnimation function)
    const $container = window.$('.noScrolQ')
    const $middleElement = window.$('#middleQ')
    
    if ($container.length && $middleElement.length) {
      // Use duration from backend (5000ms) instead of hardcoded value
      const animationDuration = duration || 5000
      
      // Call scrollToCenter with duration and completion callback
      scrollToCenter($container, $middleElement, animationDuration, () => {
        // Animation completed - add blink animation
        $middleElement.addClass('blinkWinX')
        
        // Clear tape after animation completes (not based on arbitrary timeout)
        // This is the SINGLE SOURCE OF TRUTH for tape clearing
        // This ensures tape is cleared exactly when animation finishes
        const animationEndTime = Date.now()
        const animationDuration = animationEndTime - (animationStartTimeRef.current || animationEndTime)
        console.log('[ANIMATION-COMPLETE] Animation finished, clearing tape in 500ms', {
          animationDuration,
          timestamp: animationEndTime
        })
        
        setTimeout(() => {
          const clearTime = Date.now()
          console.log('[ANIMATION-COMPLETE] Clearing tape now', {
            containerExists: !!lineContainerRef.current,
            timeSinceAnimationEnd: clearTime - animationEndTime,
            timestamp: clearTime
          })
          
          if (lineContainerRef.current) {
            // Check if tape is already cleared (might have been cleared by RESOLUTION handler)
            const alreadyCleared = lineContainerRef.current.innerHTML === ''
            if (!alreadyCleared) {
              lineContainerRef.current.innerHTML = ''
              console.log('[ANIMATION-COMPLETE] Tape cleared successfully')
            } else {
              console.log('[ANIMATION-COMPLETE] Tape already cleared (by RESOLUTION handler)')
            }
          } else {
            console.warn('[ANIMATION-COMPLETE] Container not found when clearing (may have been unmounted)')
          }
          
          // Reset animation flag after animation fully completes
          animationRunningRef.current = false
          animationStartTimeRef.current = null
          // Record completion time for state machine guards
          animationCompletedTimeRef.current = clearTime
          console.log('[ANIMATION-COMPLETE] Animation lifecycle complete', {
            completedTime: clearTime,
            totalDuration: clearTime - (animationStartTimeRef.current || clearTime)
          })
        }, 500) // Small delay to show blink animation
      })
    } else {
      console.error('Animation elements not found:', {
        container: $container.length,
        middleElement: $middleElement.length,
        allNoScrolQ: window.$('.noScrolQ').length,
        allMiddleQ: window.$('#middleQ').length,
        lineContainer: window.$('#lineContainer').length
      })
      animationRunningRef.current = false // Reset flag on error
      animationStartTimeRef.current = null
      animationCompletedTimeRef.current = null
    }
  }

  const handleJoin = () => {
    // Don't allow joining if already joined (unless in WAITING phase where a new round can start)
    // Also check if we have participants but phase is not WAITING - this means we're in an active round
    const userHasJoined = currentUserId && userBets.length > 0 && userBets.some(bet => bet.id === currentUserId)
    const hasActiveRound = userBets.length > 0 && roomPhase !== 'WAITING' && roomPhase !== 'RESOLUTION'
    
    if (roomPhase === 'SPINNING' || roomPhase === 'RESOLUTION' || isJoining || hasActiveRound || (userHasJoined && roomPhase !== 'WAITING')) {
      console.log('[handleJoin] Join blocked:', { roomPhase, isJoining, userHasJoined, hasActiveRound, userBetsLength: userBets.length })
      return
    }

    if (currentBet < minBet || currentBet > maxBet) {
      setErrorMessage(`Bet must be between ${minBet} and ${maxBet}`)
      setShowErrorModal(true)
      return
    }

    // Convert bet from ticket units to bigint format (database format)
    // Backend expects and works with bigint format throughout
    const betBigint = currentBet * 1000000
    
    // Check balance (balance is in bigint format with 6 decimal places)
    if (userBalance < betBigint) {
      setErrorMessage('Insufficient balance')
      setShowErrorModal(true)
      return
    }

    // Set joining state
    setIsJoining(true)

    try {
      // Send bet amount in bigint format (database format)
      gameWebSocket.joinRound(currentRoom.number, betBigint)
      
      // Update balance immediately (will be confirmed by server)
      const newBalance = userBalance - betBigint
      setUserBalance(newBalance)
      if (onBalanceUpdate) {
        onBalanceUpdate(formatBalance(newBalance))
      }
    } catch (error) {
      setIsJoining(false) // Reset on immediate error
      setErrorMessage(error.message || 'Failed to join round')
      setShowErrorModal(true)
    }
  }

  const openModal = (modalName) => {
    if (modalName === 'rulesModal') {
      setShowRulesModal(true)
      if (typeof window.openModal === 'function') {
        window.openModal('rulesModal')
      }
    } else if (modalName === 'errorModal') {
      setShowErrorModal(true)
      if (typeof window.openModal === 'function') {
        window.openModal('errorModal')
      }
    } else if (typeof window.openModal === 'function') {
      window.openModal(modalName)
    }
    document.body.style.overflow = 'hidden'
  }

  const closeModal = (modalName) => {
    if (modalName === 'rulesModal') {
      setShowRulesModal(false)
      if (typeof window.closeModal === 'function') {
        window.closeModal('rulesModal')
      }
    } else if (modalName === 'errorModal') {
      setShowErrorModal(false)
      if (typeof window.closeModal === 'function') {
        window.closeModal('errorModal')
      }
    } else if (typeof window.closeModal === 'function') {
      window.closeModal(modalName)
    }
    document.body.style.overflow = 'auto'
  }

  const formatNumber = (number) => {
    return Math.floor(number).toLocaleString('ru-RU')
  }

  const handleRoomChange = (room) => {
    // Disconnect from current room
    gameWebSocket.disconnect()
    setCurrentRoom(room)
    // WebSocket will reconnect in useEffect
  }

  return (
    <>
      <section>
        <div className="container">
          <div className="spin__header">
            <button
              onClick={() => openModal('rulesModal')}
              className="spin__button"
            >
              <img src={infoIcon} alt="info" width="34" />
            </button>
            <RoomDropdown
              currentRoom={currentRoom}
              rooms={rooms}
              onRoomChange={handleRoomChange}
            />
            <button
              onClick={() => onNavigate && onNavigate('gameHistory')}
              className="spin__button"
            >
              <img src={historyIcon} alt="history" width="42" />
            </button>
          </div>

          <div className="lottery-stats">
            <div className="lottery-stats__item">
              <span className="lottery-stats__label">Registered:</span>
              <span className="lottery-stats__value">{registeredUsers} 👤</span>
            </div>
            {currentUserId && userTickets > 0 && totalTickets > 0 && (
              <div className="lottery-stats__item">
                <span className="lottery-stats__label">Your Chance:</span>
                <span className="lottery-stats__value">{calculateWinChance()}%</span>
              </div>
            )}
            <div className="lottery-stats__item">
              <span className="lottery-stats__label">Total Tickets:</span>
              <span className="lottery-stats__value">{formatNumber(totalTickets)}</span>
            </div>
          </div>

          <div className="spin__game-container" style={{ position: 'relative' }}>
            <img
              className="spin__arrow"
              src={arrowDownIcon}
              alt="arrow"
              width="36"
            />
            {/* Container is always mounted to prevent ref from becoming null during animation */}
            {/* Hide container visually when showing waiting message or winner, but keep it mounted */}
            <div
              className="spin__game scroll-block noScrolQ"
              id="lineContainer"
              ref={lineContainerRef}
              style={{ 
                visibility: (registeredUsers === 0 && roomPhase === 'WAITING') || winner ? 'hidden' : 'visible',
                height: (registeredUsers === 0 && roomPhase === 'WAITING') || winner ? 0 : 'auto',
                minHeight: (registeredUsers === 0 && roomPhase === 'WAITING') || winner ? 0 : '110px',
                overflow: (registeredUsers === 0 && roomPhase === 'WAITING') || winner ? 'hidden' : 'auto'
              }}
            />
            
            {/* "Waiting for users..." message - only show when no users and in WAITING phase */}
            {registeredUsers === 0 && roomPhase === 'WAITING' && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '110px',
                color: 'white',
                fontSize: '18px',
                textAlign: 'center',
                padding: '20px'
              }}>
                Waiting for users...
              </div>
            )}
            
            {/* Winner display - only show when winner exists */}
            {winner && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '110px',
                color: 'white',
                padding: '20px',
                textAlign: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.7)', // Semi-transparent background
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>
                  Winner: User {winner.userId}
                </div>
                <div style={{ fontSize: '16px', marginBottom: '5px' }}>
                  Bet: {formatBalance(winner.tickets)}
                </div>
                <div style={{ fontSize: '16px', marginBottom: '5px', color: '#6cc5a1' }}>
                  Win: {formatBalance(winner.payout)}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>
                  Chance: {totalTickets > 0 ? (((winner.tickets / 1000000) / totalTickets) * 100).toFixed(2) : 0}%
                </div>
              </div>
            )}
          </div>

          <div className="spin__bets">
            <p className="spin__bets-title">Choose your bet:</p>
            
            <div className="spin__controls-row">
              <button
                className="spin__control-btn changeBetBT"
                onClick={() => handleBetChange('min')}
              >
                <span>min</span>
              </button>
              <input
                type="text"
                className="spin__input"
                placeholder="1000"
                id="amountBet"
                value={currentBet}
                readOnly
                onClick={handleInputClick}
              />
              <button
                className="spin__control-btn changeBetBT"
                onClick={() => handleBetChange('max')}
              >
                <span>max</span>
              </button>
            </div>

                  <button
                    className="education__button"
                    id="startGame"
                    onClick={handleJoin}
                    disabled={!wsConnected || roomPhase === 'SPINNING' || roomPhase === 'RESOLUTION' || isJoining || (currentUserId && userBets.length > 0 && userBets.some(bet => bet.id === currentUserId) && roomPhase !== 'WAITING')}
                  >
                    <span className="education__button-text" id="textButton">
                      {!wsConnected ? 'Connecting...' : 
                       roomPhase === 'SPINNING' ? 'Spinning...' : 
                       roomPhase === 'RESOLUTION' ? 'Round Ended' :
                       isJoining ? 'Joining...' :
                       countdownActive && countdownRemaining !== null ? `Joining... ${Math.ceil(countdownRemaining)}s` : 
                       (currentUserId && userBets.length > 0 && userBets.some(bet => bet.id === currentUserId) && roomPhase === 'WAITING') ? 'Joined' : 
                       (currentUserId && userBets.length > 0 && userBets.some(bet => bet.id === currentUserId) && roomPhase !== 'WAITING' && roomPhase !== 'RESOLUTION') ? 'Spinning...' : 'JOIN'}
                    </span>
                  </button>
          </div>

          <p className="spin__subtitle">User's Bets</p>
          <div className="spin__bets-list">
            {userBets.map((bet) => (
              <div
                key={bet.id}
                className={`spin__bets-item ${bet.tickets > 0 ? 'spin__bets-item--success' : ''}`}
              >
                <img
                  src={bet.avatar}
                  alt="user"
                  width="56"
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.src = defaultAvatar
                  }}
                />
                <div className="spin__bets-info">
                  <p className="spin__bets-name">{bet.name}</p>
                  <p className="spin__bets-amount">
                    {bet.tickets > 0 ? '+' : ''}
                    {formatNumber(bet.tickets)} Tickets
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rules Modal */}
      {showRulesModal && (
        <div
          className="layout active"
          data-modal="rulesModal"
          onClick={(e) => {
            if (e.target.classList.contains('layout')) {
              closeModal('rulesModal')
            }
          }}
        >
          <div className="modal modal__account-spin" onClick={(e) => e.stopPropagation()}>
            <p className="modal__account-spin-title">Roulette Rules</p>
            <p className="modal__account-spin-text">
              <span>
                - Demo mode = no real money, just for fun. <br />
                - Real mode allows you to place bets with real money.
              </span>
              <span> Set your bet and tap "JOIN".</span>
              <span> Possible multipliers: x0, x1.5, x3, x10, x50, x100 </span>
            </p>
          </div>
        </div>
      )}

      {/* Custom Keyboard Modal */}
      {showKeyboardModal && (
        <CustomKeyboard
          value={currentBet}
          onChange={setCurrentBet}
          onConfirm={handleKeyboardConfirm}
          onClose={handleKeyboardClose}
        />
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div
          className="layout active"
          data-modal="errorModal"
          onClick={(e) => {
            if (e.target.classList.contains('layout')) {
              closeModal('errorModal')
            }
          }}
        >
          <div className="modal modal__account-spin" onClick={(e) => e.stopPropagation()}>
            <p className="modal__account-spin-title" style={{ color: 'red' }}>
              Error
            </p>
            <p className="modal__account-spin-text">{errorMessage}</p>
            <button
              onClick={() => {
                closeModal('errorModal')
                // Reset joining state when modal is closed
                setIsJoining(false)
              }}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#6cc5a1',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  )
}
