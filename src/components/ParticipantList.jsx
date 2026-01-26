import { memo, useMemo } from 'react'
import ParticipantItem from './ParticipantItem'

/**
 * Optimized participant list component with React.memo.
 * Only re-renders when participants array reference changes or specific participants change.
 * Uses React.memo to prevent unnecessary re-renders when other state updates.
 * 
 * Props:
 * - participants: Array of participant objects with userId, bet, avatarUrl
 * - className: Additional CSS classes for container
 */
const ParticipantList = memo(({ participants = [], className = '' }) => {
  // Calculate total bet once (memoized)
  const totalBet = useMemo(() => {
    return participants.reduce((sum, p) => sum + (p.bet || 0), 0)
  }, [participants])

  if (!participants || participants.length === 0 || totalBet === 0) {
    return null
  }

  return (
    <div className={className} style={{ display: 'flex', gap: '8px' }}>
      {participants.map((participant) => (
        <ParticipantItem
          key={participant.userId} // Use userId as key for stable identity
          participant={participant}
          totalBet={totalBet}
          showWinChance={true}
        />
      ))}
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if participants array changed
  // This prevents re-renders when other state updates
  if (prevProps.participants.length !== nextProps.participants.length) {
    return false // Re-render if length changed
  }
  
  // Check if any participant data changed
  // Use a Set for O(1) lookup instead of O(n) array search
  const prevIds = new Set(prevProps.participants.map(p => p.userId))
  const nextIds = new Set(nextProps.participants.map(p => p.userId))
  
  // Check if IDs match
  if (prevIds.size !== nextIds.size) {
    return false
  }
  
  for (const id of prevIds) {
    if (!nextIds.has(id)) {
      return false
    }
  }
  
  // Check if any participant data changed
  const prevMap = new Map(prevProps.participants.map(p => [p.userId, p]))
  for (const next of nextProps.participants) {
    const prev = prevMap.get(next.userId)
    if (!prev) {
      return false
    }
    if (
      prev.bet !== next.bet ||
      prev.avatarUrl !== next.avatarUrl
    ) {
      return false // Re-render if any participant changed
    }
  }
  
  return true // Skip re-render if nothing changed
})

ParticipantList.displayName = 'ParticipantList'

export default ParticipantList

