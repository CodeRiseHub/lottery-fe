import { memo } from 'react'
import ParticipantAvatar from './ParticipantAvatar'

/**
 * Optimized participant item component with React.memo.
 * Only re-renders when this specific participant's data changes.
 * 
 * Props:
 * - participant: Participant object with userId, bet, avatarUrl
 * - totalBet: Total bet for win chance calculation
 * - showWinChance: Whether to show win chance percentage (default: true)
 */
const ParticipantItem = memo(({ participant, totalBet, showWinChance = true }) => {
  const { userId, bet, avatarUrl } = participant
  
  // Calculate win chance percentage
  const winChance = totalBet > 0 ? ((bet || 0) / totalBet) * 100 : 0
  
  return (
    <div 
      className="spin__game-item" 
      style={{ 
        flexDirection: 'column', 
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <ParticipantAvatar 
        avatarUrl={avatarUrl} 
        userId={userId} 
        size={56}
      />
      {showWinChance && (
        <div style={{
          textAlign: 'center',
          color: '#fff',
          fontSize: '12px',
          fontFamily: "'Chakra Petch', sans-serif",
          lineHeight: '1.2',
          marginTop: '4px'
        }}>
          {winChance.toFixed(2)}%
        </div>
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if this specific participant's data changed
  return (
    prevProps.participant.userId === nextProps.participant.userId &&
    prevProps.participant.bet === nextProps.participant.bet &&
    prevProps.participant.avatarUrl === nextProps.participant.avatarUrl &&
    prevProps.totalBet === nextProps.totalBet &&
    prevProps.showWinChance === nextProps.showWinChance
  )
})

ParticipantItem.displayName = 'ParticipantItem'

export default ParticipantItem

