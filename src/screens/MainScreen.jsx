import { useState, useEffect, useRef } from 'react'
import infoIcon from '../assets/images/tasks/info.png'
import historyIcon from '../assets/images/tasks/history.png'
import arrowDownIcon from '../assets/images/tasks/arrow-down.png'
import defaultAvatar from '../assets/images/default.png'
import avatar1 from '../assets/avatars/avatar1.svg'
import avatar2 from '../assets/avatars/avatar2.svg'
import avatar3 from '../assets/avatars/avatar3.svg'
import starIcon from '../assets/images/header/star.png'
import RoomDropdown from '../components/RoomDropdown'
import CustomKeyboard from '../components/CustomKeyboard'
import { gameWebSocket } from '../services/gameWebSocket'
import { formatBalance } from '../utils/balanceFormatter'
import { fetchCompletedRounds } from '../api'
import '../utils/modals'

export default function MainScreen({ onNavigate, onBalanceUpdate, userData }) {
  const [currentBet, setCurrentBet] = useState(1) // Will be updated from state
  const [gameStarted, setGameStarted] = useState(false)
  const [showRulesModal, setShowRulesModal] = useState(false)
  const [showKeyboardModal, setShowKeyboardModal] = useState(false)
  const [countdownActive, setCountdownActive] = useState(false)
  const [countdownProgress, setCountdownProgress] = useState(0)
  const [countdownRemaining, setCountdownRemaining] = useState(null)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [registeredUsers, setRegisteredUsers] = useState(0)
  const [totalBet, setTotalBet] = useState(0)
  const [currentRoom, setCurrentRoom] = useState({ number: 1, users: 0 })
  const [rooms, setRooms] = useState([
    { number: 1, users: 0 },
    { number: 2, users: 0 },
    { number: 3, users: 0 }
  ])
  const [userBets, setUserBets] = useState([])
  const [completedRounds, setCompletedRounds] = useState([])
  const [roomPhase, setRoomPhase] = useState('WAITING')
  const [buttonPhase, setButtonPhase] = useState('WAITING') // Separate state for button rendering to force re-render
  const [buttonUpdateCounter, setButtonUpdateCounter] = useState(0) // Counter to force button re-render
  const [winner, setWinner] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [userBalance, setUserBalance] = useState(0) // Balance in bigint format
  const [isJoining, setIsJoining] = useState(false) // Track if JOIN request was sent but not yet acknowledged (reset on reconnect)
  const [currentUserId, setCurrentUserId] = useState(null) // Current user ID
  const [minBet, setMinBet] = useState(1) // Room-specific min bet (from backend state)
  const [maxBet, setMaxBet] = useState(100) // Room-specific max bet (from backend state)
  const lineContainerRef = useRef(null)
  const countdownIntervalRef = useRef(null)
  const animationRunningRef = useRef(false) // Track if animation is currently running
  const animationStartTimeRef = useRef(null) // Track when animation started (for timeout)
  const animationCompletedTimeRef = useRef(null) // Track when animation completed (for state machine guards)
  const currentPhaseRef = useRef('WAITING') // Track current phase synchronously for button state
  const onBalanceUpdateRef = useRef(onBalanceUpdate) // Store latest onBalanceUpdate callback

  // Shuffle array using Fisher-Yates algorithm
  const shuffleArray = (array) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Generate pre-spin tape: one block per participant with avatar and win chance
  const generatePreSpinTapeHTML = (participants) => {
    if (!participants || participants.length === 0) {
      return '' // Return empty - will show "Waiting for users..." message
    }

    const totalBet = participants.reduce((sum, p) => sum + (p.bet || 0), 0)
    if (totalBet === 0) {
      return ''
    }

    const items = []
    
    participants.forEach((participant) => {
      // Calculate win chance percentage
      const winChance = totalBet > 0 ? ((participant.bet || 0) / totalBet) * 100 : 0
      
      // Get avatar URL
      let avatarUrl = participant.avatarUrl
      if (!avatarUrl || avatarUrl === 'null' || avatarUrl === String(participant.userId)) {
        // Fallback to placeholder avatars if backend didn't provide a valid URL
        const avatarIndex = participant.userId % 3
        const avatars = [avatar1, avatar2, avatar3]
        avatarUrl = avatars[avatarIndex]
      }
      
      // Create block with avatar and chance below
      items.push(
        `<div class='spin__game-item' style="flex-direction: column; padding: 8px;">
          <img src="${avatarUrl}" alt="avatar" width="56" height="56" style="border-radius: 50%; margin-bottom: 4px;" />
          <div style="text-align: center; color: #fff; font-size: 12px; font-family: 'Chakra Petch', sans-serif; line-height: 1.2;">
            ${winChance.toFixed(2)}%
          </div>
        </div>`
      )
    })
    
    return items.join('')
  }

  // Generate tape with shuffled avatars proportional to win chances (for SPINNING phase only)
  const generateTapeHTML = (participants, stopIndex, winnerFromState) => {
    if (!participants || participants.length === 0) {
      return '' // Return empty - will show "Waiting for users..." message
    }

    const totalBet = participants.reduce((sum, p) => sum + (p.bet || 0), 0)
    if (totalBet === 0) {
      return ''
    }

    // CRITICAL: Identify the winner
    // Priority: 1) Use winner from state (backend authoritative), 2) Calculate from stopIndex
    // NEVER default to first participant - if we can't determine winner, log error and return empty
    let cumulative = 0
    let winnerParticipant = null
    const participantRanges = []
    
    // First, build participant ranges for logging
    for (const participant of participants) {
      const start = cumulative
      cumulative += (participant.bet || 0)
      const end = cumulative
      participantRanges.push({ userId: participant.userId, start, end, bet: participant.bet })
    }
    
    // Try to identify winner: first from state, then from stopIndex
    if (winnerFromState && winnerFromState.userId) {
      // Use winner from backend state (authoritative source)
      winnerParticipant = participants.find(p => p.userId === winnerFromState.userId)
    } else if (stopIndex !== null && stopIndex !== undefined && stopIndex >= 0) {
      // Calculate winner from stopIndex (fallback if state winner not available)
      cumulative = 0
      for (const participant of participants) {
        const start = cumulative
        cumulative += (participant.bet || 0)
        const end = cumulative
        
        if (stopIndex >= start && stopIndex < end) {
          winnerParticipant = participant
          break
        }
      }
    }
    
    // CRITICAL: If we can't determine the winner, don't generate tape
    // This prevents showing the wrong winner in the tape
    if (!winnerParticipant) {
      // Return empty string - better to show no tape than wrong winner
      return ''
    }

    // Filter participants based on rules
    const MIN_CHANCE_THRESHOLD = 0.001 // 0.1%
    const MAX_ITEMS = 500
    const USER_COUNT_THRESHOLD = 50
    
    let filteredParticipants = participants
    
    // If more than 50 users, filter by win chance (> 0.1%)
    if (participants.length > USER_COUNT_THRESHOLD) {
      filteredParticipants = participants.filter(p => {
        const winChance = totalBet > 0 ? (p.bet || 0) / totalBet : 0
        // Always include winner, even if below threshold
        return p.userId === winnerParticipant?.userId || winChance > MIN_CHANCE_THRESHOLD
      })
    }
    
    // Ensure winner is always included (safety check)
    if (winnerParticipant && !filteredParticipants.find(p => p.userId === winnerParticipant.userId)) {
      filteredParticipants.push(winnerParticipant)
    }
    
    // Recalculate total bet for filtered participants
    const filteredTotalBet = filteredParticipants.reduce((sum, p) => sum + (p.bet || 0), 0)
    
    // Calculate total items (max 500)
    const totalItems = Math.min(MAX_ITEMS, Math.max(200, filteredParticipants.length * 10))
    
    // Calculate proportional avatar counts for each participant based on win chance
    // First pass: calculate ideal counts (may be fractional)
    const participantCounts = filteredParticipants.map(participant => {
      const winChance = filteredTotalBet > 0 ? (participant.bet || 0) / filteredTotalBet : 0
      const idealCount = winChance * totalItems
      const isWinner = participant.userId === winnerParticipant?.userId
      return {
        participant,
        idealCount,
        winChance,
        isWinner
      }
    })
    
    // Second pass: use largest remainder method to distribute counts fairly
    // Ensure winner gets at least 1 avatar
    const countsWithRemainders = participantCounts.map(({ participant, idealCount, isWinner }) => {
      const floorCount = Math.floor(idealCount)
      const remainder = idealCount - floorCount
      // Winner must have at least 1, others need at least 1 if they have a bet
      const minCount = isWinner ? 1 : (participant.bet > 0 ? 1 : 0)
      return {
        participant,
        floorCount: Math.max(minCount, floorCount),
        remainder,
        isWinner
      }
    })
    
    // Calculate total allocated so far
    let totalAllocated = countsWithRemainders.reduce((sum, c) => sum + c.floorCount, 0)
    let remaining = totalItems - totalAllocated
    
    // If we exceed 500 items, remove lowest chance participants (but keep winner)
    if (totalAllocated > MAX_ITEMS) {
      // Sort by win chance (ascending), but winner always first
      const sortedByChance = [...countsWithRemainders].sort((a, b) => {
        if (a.isWinner) return -1
        if (b.isWinner) return 1
        return a.winChance - b.winChance
      })
      
      // Remove participants with lowest chances until we fit in MAX_ITEMS
      const toKeep = []
      let newTotal = 0
      for (const item of sortedByChance) {
        if (item.isWinner || (newTotal + item.floorCount <= MAX_ITEMS)) {
          toKeep.push(item)
          newTotal += item.floorCount
        }
      }
      
      // Recalculate with only kept participants
      const keptParticipants = toKeep.map(item => item.participant)
      const keptTotalBet = keptParticipants.reduce((sum, p) => sum + (p.bet || 0), 0)
      
      // Recalculate counts for kept participants
      const recalculatedCounts = keptParticipants.map(participant => {
        const winChance = keptTotalBet > 0 ? (participant.bet || 0) / keptTotalBet : 0
        const idealCount = winChance * MAX_ITEMS
        const isWinner = participant.userId === winnerParticipant?.userId
        return {
          participant,
          idealCount,
          winChance,
          isWinner,
          floorCount: Math.max(isWinner ? 1 : (participant.bet > 0 ? 1 : 0), Math.floor(idealCount)),
          remainder: idealCount - Math.floor(idealCount)
        }
      })
      
      totalAllocated = recalculatedCounts.reduce((sum, c) => sum + c.floorCount, 0)
      remaining = MAX_ITEMS - totalAllocated
      countsWithRemainders.length = 0
      countsWithRemainders.push(...recalculatedCounts)
    }
    
    // Sort by remainder (descending) to allocate remaining items fairly
    // Winner gets priority in remainder allocation
    const sortedByRemainder = [...countsWithRemainders].sort((a, b) => {
      if (a.isWinner && !b.isWinner) return -1
      if (!a.isWinner && b.isWinner) return 1
      return b.remainder - a.remainder
    })
    
    // Allocate remaining items to participants with highest remainders
    const finalCounts = countsWithRemainders.map(item => {
      const indexInSorted = sortedByRemainder.findIndex(s => s.participant.userId === item.participant.userId)
      const shouldGetExtra = indexInSorted < remaining && remaining > 0
      return {
        participant: item.participant,
        count: item.floorCount + (shouldGetExtra ? 1 : 0),
        isWinner: item.isWinner
      }
    })
    
    // Build avatar items array
    const avatarItems = []
    
    finalCounts.forEach(({ participant, count, isWinner }) => {
      // Get avatar URL
      let avatarUrl = participant.avatarUrl
      if (!avatarUrl || avatarUrl === 'null' || avatarUrl === String(participant.userId)) {
        // Fallback to placeholder avatars if backend didn't provide a valid URL
        const avatarIndex = participant.userId % 3
        const avatars = [avatar1, avatar2, avatar3]
        avatarUrl = avatars[avatarIndex]
      }
      
      // Add avatar items for this participant
      for (let i = 0; i < count; i++) {
        avatarItems.push({
          avatarUrl,
          userId: participant.userId,
          isWinner
        })
      }
    })
    
    // Shuffle the avatars randomly
    const shuffledAvatars = shuffleArray(avatarItems)
    
    // CRITICAL: Ensure winner's avatar is at the middle position
    // Find a winner's avatar and swap it to the middle
    const middleIndex = Math.floor(shuffledAvatars.length / 2)
    const winnerIndex = shuffledAvatars.findIndex(item => item.isWinner)
    
    if (winnerIndex !== -1 && winnerIndex !== middleIndex) {
      // Swap winner's avatar to middle position
      const temp = shuffledAvatars[middleIndex]
      shuffledAvatars[middleIndex] = shuffledAvatars[winnerIndex]
      shuffledAvatars[winnerIndex] = temp
    } else if (winnerIndex === -1) {
      // Fallback: if no winner found (shouldn't happen), find any winner participant's avatar
      if (winnerParticipant) {
        const fallbackIndex = shuffledAvatars.findIndex(item => item.userId === winnerParticipant.userId)
        if (fallbackIndex !== -1 && fallbackIndex !== middleIndex) {
          const temp = shuffledAvatars[middleIndex]
          shuffledAvatars[middleIndex] = shuffledAvatars[fallbackIndex]
          shuffledAvatars[fallbackIndex] = temp
        }
      }
    }
    
    // Generate HTML from shuffled avatars
    const items = []
    
    shuffledAvatars.forEach((item, index) => {
      const isMiddle = index === middleIndex
      items.push(
        `<div class='spin__game-item' ${isMiddle ? "id='middleQ'" : ''}>
          <img src="${item.avatarUrl}" alt="avatar" width="56" height="56" style="border-radius: 50%;" />
        </div>`
      )
    })
    
    return items.join('')
  }

  // Calculate user's win chance percentage
  // Derive user bet from userBets (authoritative server data) instead of local state
  const calculateWinChance = () => {
    if (totalBet === 0 || !currentUserId) return 0
    
    // Find current user's bet from participants list
    const userBet = userBets.find(bet => bet.id === currentUserId)
    if (!userBet || userBet.bet === 0) return 0
    
    // userBet.bet is in bigint format, convert to display units
    const userBetDisplay = userBet.bet / 1000000
    if (userBetDisplay === 0) return 0
    
    return ((userBetDisplay / totalBet) * 100).toFixed(2)
  }

  // Keep onBalanceUpdateRef up to date
  useEffect(() => {
    onBalanceUpdateRef.current = onBalanceUpdate
  }, [onBalanceUpdate])

  // Set user ID and balance from userData prop (fetched by App.jsx) - only run when userData changes
  useEffect(() => {
    if (userData) {
      if (userData.id) {
        setCurrentUserId(userData.id)
        // Update remote logger with user ID
        import('../utils/remoteLogger').then(({ setUserId }) => {
          setUserId(userData.id)
        })
      }
      if (userData.balanceA !== undefined) {
        setUserBalance(userData.balanceA)
        // Use ref to avoid dependency on onBalanceUpdate (which changes on every render)
        if (onBalanceUpdateRef.current) {
          onBalanceUpdateRef.current(formatBalance(userData.balanceA))
        }
      }
    }
  }, [userData]) // Only depend on userData, not onBalanceUpdate

  // Animation flag timeout - reset if stuck for more than 10 seconds
  useEffect(() => {
    const checkAnimationTimeout = setInterval(() => {
      if (animationRunningRef.current && animationStartTimeRef.current) {
        const elapsed = Date.now() - animationStartTimeRef.current
        if (elapsed > 10000) { // 10 seconds timeout
          animationRunningRef.current = false
          animationStartTimeRef.current = null
        }
      }
    }, 1000) // Check every second
    
    return () => clearInterval(checkAnimationTimeout)
  }, [])
  
  // Reset isJoining when user is detected as already joined (e.g., after reconnection)
  useEffect(() => {
    if (currentUserId && userBets.length > 0) {
      const userHasJoined = userBets.some(bet => bet.id === currentUserId)
      if (userHasJoined && isJoining) {
        setIsJoining(false)
      }
    }
  }, [currentUserId, userBets, isJoining])

  // RoomPhase timeout - reset if stuck in SPINNING or RESOLUTION
  // Only depend on roomPhase to ensure timeout is always set when phase changes
  useEffect(() => {
    if (roomPhase === 'SPINNING') {
      const timeout = setTimeout(() => {
        // If still in SPINNING after 8 seconds, force transition to RESOLUTION
        // This handles cases where WebSocket message was missed
        setButtonPhase('RESOLUTION') // Update button phase state FIRST (triggers re-render)
        setButtonUpdateCounter(prev => prev + 1) // Force re-render
        setRoomPhase('RESOLUTION') // Update room phase state
        currentPhaseRef.current = 'RESOLUTION' // Update ref AFTER state (for guards/timers only)
      }, 8000) // 8 seconds (5000ms animation + 3000ms buffer)
      
      return () => {
        clearTimeout(timeout)
      }
    } else if (roomPhase === 'RESOLUTION') {
      const timeout = setTimeout(() => {
        // If still in RESOLUTION after 10 seconds, force transition to WAITING
        // This handles cases where WAITING message was missed
        setButtonPhase('WAITING') // Update button phase state FIRST (triggers re-render)
        setButtonUpdateCounter(prev => prev + 1) // Force re-render
        setRoomPhase('WAITING') // Update room phase state
        currentPhaseRef.current = 'WAITING' // Update ref AFTER state (for guards/timers only)
        // Clear winner when forcing WAITING
        setWinner(null)
        // Reset animation completion time
        animationCompletedTimeRef.current = null
      }, 10000) // 10 seconds (6 seconds backend delay + 4 seconds buffer)
      
      return () => {
        clearTimeout(timeout)
      }
    }
  }, [roomPhase]) // Only depend on roomPhase to ensure timeout is always set
  
  // WebSocket connection and state updates
  useEffect(() => {
    const roomNumber = currentRoom.number

    // Connect to WebSocket
    gameWebSocket.connect(
      roomNumber,
      (state) => {
        // Update state from server (authoritative source)
        setRegisteredUsers(state.registeredPlayers || 0)
        // totalBet from backend is in bigint format, convert to display units
        const totalBetBigint = state.totalBet || 0
        const totalBetDisplay = totalBetBigint / 1000000
        setTotalBet(totalBetDisplay)
        // Update roomPhase with state validation and synchronization
        // Ensure valid phase transitions and synchronize with winner data
        const newPhase = state.phase || 'WAITING'
        const currentPhase = roomPhase
        
        // Validate phase transition (prevent skipping phases)
        // Allow: WAITING -> COUNTDOWN -> SPINNING -> RESOLUTION -> WAITING
        // Also allow: any -> WAITING (reset)
        const validTransitions = {
          'WAITING': ['COUNTDOWN', 'WAITING'],
          'COUNTDOWN': ['SPINNING', 'WAITING'],
          'SPINNING': ['RESOLUTION', 'WAITING'],
          'RESOLUTION': ['WAITING']
        }
        
        // Handle RESOLUTION phase - update phase even if winner data is missing (it may arrive separately)
        // This ensures phase updates on mobile where messages might arrive out of order
        if (newPhase === 'RESOLUTION') {
          // Update phase immediately when RESOLUTION arrives
          // Winner data can be set separately when it arrives (handled below)
          setButtonPhase(newPhase) // Update button phase state FIRST (triggers re-render)
          setButtonUpdateCounter(prev => prev + 1) // Force re-render
          setRoomPhase(newPhase) // Update room phase state
          currentPhaseRef.current = newPhase // Update ref AFTER state (for guards/timers only)
        } else if (newPhase === 'WAITING') {
          // For WAITING, always allow the transition
          // The state machine guard was too aggressive and causing stuck states on mobile
          // Tape clearing is handled by the animation callback, so we don't need to block WAITING
          setButtonPhase(newPhase) // Update button phase state FIRST (triggers re-render)
          setButtonUpdateCounter(prev => prev + 1) // Always increment counter to force re-render, even if buttonPhase is already WAITING
          setRoomPhase(newPhase) // Update room phase state
          currentPhaseRef.current = newPhase // Update ref AFTER state (for guards/timers only)
          // Don't reset animationCompletedTimeRef here - let WAITING handler do it after phase is confirmed
          // This ensures roomPhase state is updated before any ref resets, preventing button state issues
        } else if (currentPhase === newPhase) {
          // Same phase - always allow (might be a refresh or duplicate message)
          setButtonPhase(newPhase) // Update button phase state FIRST (triggers re-render)
          setButtonUpdateCounter(prev => prev + 1) // Force re-render
          setRoomPhase(newPhase) // Update room phase state
          currentPhaseRef.current = newPhase // Update ref AFTER state (for guards/timers only)
        } else if (validTransitions[currentPhase] && validTransitions[currentPhase].includes(newPhase)) {
          // Valid transition according to state machine
          setButtonPhase(newPhase) // Update button phase state FIRST (triggers re-render)
          setButtonUpdateCounter(prev => prev + 1) // Force re-render
          setRoomPhase(newPhase) // Update room phase state
          currentPhaseRef.current = newPhase // Update ref AFTER state (for guards/timers only)
        } else {
          // Invalid transition - allow it (might be due to missed messages)
          // This is important for mobile where messages might arrive out of order
          setButtonPhase(newPhase) // Update button phase state FIRST (triggers re-render)
          setButtonUpdateCounter(prev => prev + 1) // Force re-render
          setRoomPhase(newPhase) // Update room phase state
          currentPhaseRef.current = newPhase // Update ref AFTER state (for guards/timers only)
        }
        
        // Update room user counts for all rooms
        // Backend sends allRoomsConnectedUsers map with counts for all rooms (1, 2, 3)
        // This ensures all room counters are updated even when user switches rooms
        if (state.allRoomsConnectedUsers && typeof state.allRoomsConnectedUsers === 'object') {
          setRooms(prevRooms => 
            prevRooms.map(room => {
              const count = state.allRoomsConnectedUsers[room.number] || 0
              return { ...room, users: count }
            })
          )
          // Also update currentRoom if it matches
          if (state.roomNumber !== undefined && state.roomNumber !== null) {
            const currentRoomCount = state.allRoomsConnectedUsers[state.roomNumber] || 0
            if (currentRoom.number === state.roomNumber) {
              setCurrentRoom(prev => ({ ...prev, users: currentRoomCount }))
            }
          }
        } else if (state.roomNumber !== undefined && state.roomNumber !== null) {
          // Fallback: if allRoomsConnectedUsers is not available, update only current room
          const userCount = state.connectedUsers || 0
          setRooms(prevRooms => 
            prevRooms.map(room => 
              room.number === state.roomNumber 
                ? { ...room, users: userCount }
                : room
            )
          )
          if (currentRoom.number === state.roomNumber) {
            setCurrentRoom(prev => ({ ...prev, users: userCount }))
          }
        }
        
        // Update bet limits from state (room-specific)
        if (state.minBet !== undefined && state.maxBet !== undefined) {
          const newMinBet = state.minBet / 1000000 // Convert from bigint to display value
          const newMaxBet = state.maxBet / 1000000
          setMinBet(newMinBet)
          setMaxBet(newMaxBet)
          
          // Update currentBet to minBet if it's outside the new limits or if room changed
          if (currentBet < newMinBet || currentBet > newMaxBet || currentRoom.number !== state.roomNumber) {
            setCurrentBet(newMinBet)
          }
        }
        
        // Update participants and calculate user's bet
        if (state.participants && state.participants.length > 0) {
          const bets = state.participants.map(p => ({
            id: p.userId,
            avatar: p.avatarUrl || defaultAvatar, // Use backend avatar URL, fallback to default
            name: `User ${p.userId}`,
            bet: p.bet || 0
          }))
          setUserBets(bets)
          
          // Derive JOIN/JOINED state from server data (authoritative source)
          // If user is in participants, they are JOINED - reset isJoining
          // This handles reconnect case where user was already joined before app closed
          if (currentUserId && state.participants.some(p => p.userId === currentUserId) && isJoining) {
            setIsJoining(false)
          }

          // Update tape with participants (but NOT during SPINNING - that's handled separately)
          // Only update tape for WAITING and COUNTDOWN phases
          // Set HTML synchronously when DOM is ready (no requestAnimationFrame needed)
          if ((state.phase === 'WAITING' || state.phase === 'COUNTDOWN') && lineContainerRef.current) {
            const tapeHTML = generatePreSpinTapeHTML(state.participants)
            if (tapeHTML) {
              lineContainerRef.current.innerHTML = tapeHTML
            }
          }
        } else {
          setUserBets([])
          // Don't clear tape here - let animation callback handle it
          // Only clear if we're in WAITING phase AND animation completed more than 1 second ago
          // This prevents race condition between animation completion and WAITING state
          if (lineContainerRef.current && state.phase === 'WAITING') {
            const now = Date.now()
            const animationCompletedTime = animationCompletedTimeRef.current
            const timeSinceCompletion = animationCompletedTime ? now - animationCompletedTime : null
            
            // Only clear if animation completed more than 1 second ago, or never ran
            if (!animationCompletedTime || timeSinceCompletion > 1000) {
              lineContainerRef.current.innerHTML = ''
              animationCompletedTimeRef.current = null // Reset after clearing
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
        
        // If user has joined but isJoining is still true (e.g., after reconnection), reset it
        // This ensures button shows "Joined" instead of "Joining..." when user reconnects
        if (userHasJoined && isJoining) {
          setIsJoining(false)
        }

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
            
            if (lineContainerRef.current) {
              // Use winner from state if available (backend authoritative), otherwise use local winner state
              const winnerToUse = state.winner || winner
              const tapeHTML = generateTapeHTML(state.participants, state.stopIndex, winnerToUse)
              if (tapeHTML) {
                lineContainerRef.current.innerHTML = tapeHTML
              }
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
          
          if (animationCompletedTime && timeSinceCompletion < 1000) {
            // Animation just completed (< 1 second ago), skip WAITING processing
            // Tape clearing is handled by animation callback
            return // Skip this state update to prevent race condition
          }
          
          // Reset animation completion time when actually in WAITING phase (new round starting)
          // This ensures roomPhase state is updated before resetting the ref
          if (animationCompletedTimeRef.current) {
            animationCompletedTimeRef.current = null
          }
          
          // If animation wasn't running (single participant refund), allow tape clearing
          if (!animationRunningRef.current && (!state.participants || state.participants.length === 0)) {
            setUserBets([])
            if (lineContainerRef.current) {
              lineContainerRef.current.innerHTML = ''
            }
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
            lineContainerRef.current.innerHTML = ''
            // Don't reset animationRunningRef here - let the callback do it
            // This prevents the callback from trying to clear a non-existent container
          } else if (!animationRunningRef.current && lineContainerRef.current) {
            // Animation wasn't running (single participant refund), clear immediately
            lineContainerRef.current.innerHTML = ''
          }
        }

        // Handle winner - only clear when actually moving to WAITING phase
        // Don't clear winner just because phase is not RESOLUTION (might be transitioning)
        if (state.phase === 'RESOLUTION' && state.winner) {
          setWinner(state.winner)
          // Balance update will be received via WebSocket balance update message
          // No need to manually update here - WebSocket will send the updated balance
        } else if (state.phase === 'WAITING') {
          // Only clear winner when actually in WAITING phase (new round started)
          setWinner(null)
        }
        // Don't clear winner for other phases (COUNTDOWN, SPINNING) - keep it visible during transition
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
        const wasConnected = wsConnected
        setWsConnected(connected)
        
        // On reconnect (was disconnected, now connected), reset only local joining state
        // Server will automatically send current room state when client subscribes
        if (!wasConnected && connected) {
          setIsJoining(false) // Reset local joining state - this is purely frontend state
          // Server will send state automatically on subscription via WebSocketSubscriptionListener
        }
      },
      (balanceBigint) => {
        // Balance update callback from WebSocket
        if (balanceBigint !== null && balanceBigint !== undefined) {
          const formattedBalance = formatBalance(balanceBigint)
          setUserBalance(balanceBigint)
          if (onBalanceUpdate) {
            onBalanceUpdate(formattedBalance)
          }
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
      return
    }
    
    const container = $container[0]
    const element = $element[0]
    if (!container || !element) {
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
        setTimeout(() => {
          if (lineContainerRef.current) {
            // Check if tape is already cleared (might have been cleared by RESOLUTION handler)
            const alreadyCleared = lineContainerRef.current.innerHTML === ''
            if (!alreadyCleared) {
              lineContainerRef.current.innerHTML = ''
            }
          }
          
          // Reset animation flag after animation fully completes
          animationRunningRef.current = false
          animationStartTimeRef.current = null
          // Record completion time for state machine guards
          animationCompletedTimeRef.current = Date.now()
        }, 500) // Small delay to show blink animation
      })
    } else {
      animationRunningRef.current = false // Reset flag on error
      animationStartTimeRef.current = null
      animationCompletedTimeRef.current = null
    }
  }

  const handleJoin = () => {
    // Only block if round is spinning or in resolution, or if request is in progress
    if (buttonPhase === 'SPINNING' || buttonPhase === 'RESOLUTION' || isJoining) {
      return
    }

    if (currentBet < minBet || currentBet > maxBet) {
      setErrorMessage(`Bet must be between ${minBet} and ${maxBet}`)
      setShowErrorModal(true)
      return
    }

    // Convert bet from display units to bigint format (database format)
    // Backend expects and works with bigint format throughout
    const betBigint = currentBet * 1000000
    
    // Check balance (balance is in bigint format with 6 decimal places)
    if (userBalance < betBigint) {
      setErrorMessage('Insufficient balance')
      setShowErrorModal(true)
      return
    }

    // Set joining state temporarily (will be reset after state update)
    setIsJoining(true)

    try {
      // Send bet amount in bigint format (database format)
      gameWebSocket.joinRound(currentRoom.number, betBigint)
      
      // Update balance immediately (will be confirmed by server)
      const newBalance = userBalance - betBigint
      const formattedNewBalance = formatBalance(newBalance)
      setUserBalance(newBalance)
      if (onBalanceUpdate) {
        onBalanceUpdate(formattedNewBalance)
      }
    } catch (error) {
      setIsJoining(false) // Reset on immediate error
      setErrorMessage(error.message || 'Failed to place bet')
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

  // Fetch completed rounds when room changes or when a round ends
  useEffect(() => {
    const loadCompletedRounds = async () => {
      try {
        const rounds = await fetchCompletedRounds(currentRoom.number)
        if (rounds && Array.isArray(rounds)) {
          setCompletedRounds(rounds)
        }
      } catch (error) {
        setCompletedRounds([])
      }
    }
    
    loadCompletedRounds()
  }, [currentRoom.number, winner]) // Reload when room changes or when winner is set (round ends)

  const handleRoomChange = (room) => {
    // Update room - WebSocket will handle unsubscribing from old room and subscribing to new room
    setCurrentRoom(room)
    // The useEffect with currentRoom.number dependency will trigger reconnection
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
              <span className="lottery-stats__value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {registeredUsers} <span style={{ fontSize: '18px' }}>👤</span>
              </span>
            </div>
            
            {/* Countdown ring - always render container to maintain layout, show/hide content */}
            <div className="lottery-stats__item" style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              width: countdownActive && countdownRemaining !== null ? '36px' : '0',
              minWidth: countdownActive && countdownRemaining !== null ? '36px' : '0',
              overflow: 'hidden',
              transition: 'width 0.2s, min-width 0.2s'
            }}>
              {countdownActive && countdownRemaining !== null ? (
                <div style={{ position: 'relative', width: '32px', height: '32px', flexShrink: 0 }}>
                  <svg width="32" height="32" style={{ transform: 'rotate(-90deg)' }}>
                    {/* Background circle */}
                    <circle
                      cx="16"
                      cy="16"
                      r="14"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.2)"
                      strokeWidth="2"
                    />
                    {/* Progress circle - counterclockwise animation from top */}
                    <circle
                      cx="16"
                      cy="16"
                      r="14"
                      fill="none"
                      stroke="#6cc5a1"
                      strokeWidth="2"
                      strokeDasharray={`${2 * Math.PI * 14}`}
                      strokeDashoffset={`${2 * Math.PI * 14 * (countdownProgress / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                    />
                  </svg>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: '#6cc5a1',
                    lineHeight: '1'
                  }}>
                    {Math.ceil(countdownRemaining)}
                  </div>
                </div>
              ) : null}
            </div>
            
            <div className="lottery-stats__item">
              <span className="lottery-stats__value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {formatNumber(totalBet)} <img src={starIcon} alt="star" width="18" height="18" />
              </span>
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
            {winner && (() => {
              // Get avatar URL, fallback to placeholder if not available
              let avatarUrl = winner.avatarUrl
              if (!avatarUrl || avatarUrl === 'null' || avatarUrl === String(winner.userId)) {
                const avatarIndex = winner.userId % 3
                const avatars = [avatar1, avatar2, avatar3]
                avatarUrl = avatars[avatarIndex]
              }
              
              return (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '110px',
                  color: 'white',
                  padding: '20px',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)', // Semi-transparent background
                  borderRadius: '8px'
                }}>
                  {/* Winner name - centered on top */}
                  <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' }}>
                    Winner: {winner.screenName || `User ${winner.userId}`}
                  </div>
                  
                  {/* Bet/Win/Chance block divided into left (avatar) and right (text) parts */}
                  <div style={{ 
                    display: 'flex', 
                    width: '100%',
                    gap: '20px',
                    alignItems: 'flex-start'
                  }}>
                    {/* Left part: Round avatar centered, sized to match text block height */}
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: '0 0 auto',
                      minWidth: '100px'
                    }}>
                      <img 
                        src={avatarUrl} 
                        alt="Winner avatar" 
                        style={{ 
                          width: '90px', 
                          height: '90px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }} 
                      />
                    </div>
                    
                    {/* Right part: Bet/Win/Chance centered in right section */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '90px'
                    }}>
                      <div style={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '100%'
                      }}>
                        <div style={{ fontSize: '16px', textAlign: 'center', marginBottom: '8px' }}>
                          Bet: {formatBalance(winner.bet)}
                        </div>
                        <div style={{ fontSize: '16px', color: '#6cc5a1', textAlign: 'center', marginBottom: '8px' }}>
                          Win: {formatBalance(winner.payout)}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.8, textAlign: 'center' }}>
                          Chance: {totalBet > 0 ? (((winner.bet / 1000000) / totalBet) * 100).toFixed(2) : 0}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
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
                placeholder={minBet.toString()}
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
                    key={buttonPhase} // Force remount on iOS WKWebView when phase changes
                    className="education__button"
                    id="startGame"
                    onClick={handleJoin}
                    disabled={!wsConnected || buttonPhase === 'SPINNING' || buttonPhase === 'RESOLUTION' || isJoining}
                    style={buttonPhase === 'RESOLUTION' ? { pointerEvents: 'none', opacity: 0.6 } : {}}
                  >
                    <span className="education__button-text" id="textButton">
                      {(() => {
                        const buttonText = !wsConnected ? 'Connecting...' : 
                         buttonPhase === 'SPINNING' ? 'Spinning...' : 
                         buttonPhase === 'RESOLUTION' ? 'Round Ended' :
                         isJoining ? 'Placing bet...' :
                         'BET'
                        return buttonText
                      })()}
                    </span>
                  </button>
          </div>

          <p className="spin__subtitle">Completed Rounds</p>
          <div className="spin__bets-list">
            {completedRounds.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)', padding: '20px' }}>
                No completed rounds yet
              </div>
            ) : (
              completedRounds.map((round) => {
                // Get avatar URL, fallback to placeholder if not available
                let avatarUrl = round.winnerAvatarUrl
                if (!avatarUrl || avatarUrl === 'null' || avatarUrl === String(round.winnerUserId)) {
                  const avatarIndex = round.winnerUserId % 3
                  const avatars = [avatar1, avatar2, avatar3]
                  avatarUrl = avatars[avatarIndex]
                }
                
                // Convert bet and payout from bigint to display format
                // Values are already in bigint format, so pass directly to formatBalance
                const betDisplay = round.winnerBet || 0
                const payoutDisplay = round.payout || 0
                const chanceDisplay = round.winChance ? round.winChance.toFixed(2) : '0.00'
                
                return (
                  <div
                    key={round.roundId}
                    className="spin__bets-item spin__bets-item--success"
                  >
                    <img
                      src={avatarUrl}
                      alt="winner"
                      width="56"
                      height="56"
                      style={{ borderRadius: '50%' }}
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = defaultAvatar
                      }}
                    />
                    <div className="spin__bets-info" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <p className="spin__bets-name">{round.winnerScreenName || `User ${round.winnerUserId}`}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Bet:</span>
                          <span>{formatBalance(betDisplay)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6cc5a1' }}>
                          <span>Win:</span>
                          <span>{formatBalance(payoutDisplay)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Chance:</span>
                          <span>{chanceDisplay}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
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
              <span> Set your bet and tap "BET".</span>
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
