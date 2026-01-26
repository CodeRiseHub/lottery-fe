import { memo } from 'react'
import defaultAvatar from '../assets/images/default.png'
import avatar1 from '../assets/avatars/avatar1.svg'
import avatar2 from '../assets/avatars/avatar2.svg'
import avatar3 from '../assets/avatars/avatar3.svg'

/**
 * Optimized participant avatar component with React.memo.
 * Prevents unnecessary re-renders when other participants join/leave.
 * 
 * Props:
 * - avatarUrl: Avatar URL from backend (may be null)
 * - userId: User ID for fallback avatar selection
 * - size: Avatar size in pixels (default: 56)
 * - className: Additional CSS classes
 */
const ParticipantAvatar = memo(({ avatarUrl, userId, size = 56, className = '' }) => {
  // Determine which avatar to use
  let finalAvatarUrl = avatarUrl
  
  // Fallback to placeholder avatars if backend didn't provide a valid URL
  if (!finalAvatarUrl || finalAvatarUrl === 'null' || finalAvatarUrl === String(userId)) {
    const avatarIndex = userId % 3
    const avatars = [avatar1, avatar2, avatar3]
    finalAvatarUrl = avatars[avatarIndex]
  }
  
  return (
    <img
      src={finalAvatarUrl}
      alt={`User ${userId} avatar`}
      width={size}
      height={size}
      className={className}
      style={{
        borderRadius: '50%',
        objectFit: 'cover',
        display: 'block'
      }}
      loading="lazy" // Lazy load images for better performance
      onError={(e) => {
        // Fallback to default avatar if image fails to load
        if (e.target.src !== defaultAvatar) {
          e.target.src = defaultAvatar
        }
      }}
    />
  )
})

ParticipantAvatar.displayName = 'ParticipantAvatar'

export default ParticipantAvatar

