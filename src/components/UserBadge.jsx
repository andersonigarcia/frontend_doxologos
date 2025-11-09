import React, { useMemo } from 'react';
import { LogOut, ShieldCheck, Stethoscope, UserCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ROLE_DISPLAY = {
  admin: { 
    label: 'Administrador', 
    classes: 'bg-purple-100 text-purple-800 border-purple-200', 
    Icon: ShieldCheck 
  },
  professional: { 
    label: 'Profissional', 
    classes: 'bg-blue-100 text-blue-800 border-blue-200', 
    Icon: Stethoscope 
  },
  patient: { 
    label: 'Paciente', 
    classes: 'bg-gray-100 text-gray-800 border-gray-200', 
    Icon: UserCircle 
  },
  user: { 
    label: 'Usuário', 
    classes: 'bg-gray-100 text-gray-800 border-gray-200', 
    Icon: UserCircle 
  }
};

/**
 * UserBadge Component
 * Displays user information with role badge and logout button
 * 
 * @param {Object} props - Component props
 * @param {Object} props.user - User object (from auth context)
 * @param {string} props.userRole - User role (admin, professional, patient, user)
 * @param {Function} props.onLogout - Callback function when logout is clicked
 * @param {string} [props.layout='row'] - Layout type: 'row' (horizontal) or 'column' (vertical/mobile)
 * @param {boolean} [props.showLogoutButton=true] - Show logout button
 * @param {boolean} [props.compact=false] - Compact view (minimal info)
 * 
 * @example
 * // Desktop view (horizontal)
 * <UserBadge 
 *   user={user} 
 *   userRole={userRole}
 *   onLogout={handleLogout}
 *   layout="row"
 * />
 * 
 * @example
 * // Mobile view (vertical/compact)
 * <UserBadge 
 *   user={user} 
 *   userRole={userRole}
 *   onLogout={handleLogout}
 *   layout="column"
 *   compact={true}
 * />
 */
const UserBadge = ({
  user,
  userRole,
  onLogout,
  layout = 'row',
  showLogoutButton = true,
  compact = false
}) => {
  // Memoize display name calculation
  const displayName = useMemo(() => {
    return user?.user_metadata?.full_name || 
           user?.user_metadata?.fullName || 
           user?.email?.split('@')[0] || 
           'Usuário';
  }, [user]);

  // Memoize role display config
  const roleConfig = useMemo(() => {
    const normalizedRole = typeof userRole === 'string' 
      ? userRole.toLowerCase() 
      : 'user';
    return ROLE_DISPLAY[normalizedRole] || ROLE_DISPLAY.user;
  }, [userRole]);

  const RoleIcon = roleConfig.Icon;

  if (!user) return null;

  // Layout: column (mobile/vertical)
  if (layout === 'column') {
    return (
      <div className="flex flex-col gap-3 py-3">
        {/* User Info Section */}
        <div className={`flex items-center gap-3 px-3 ${compact ? 'flex-col text-center' : ''}`}>
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2d8659] to-[#1d5c3b] flex items-center justify-center text-white font-bold flex-shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>

          {/* User Details */}
          <div className={compact ? 'w-full' : ''}>
            <p className="text-sm font-medium text-gray-800 truncate">{displayName}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>

        {/* Role Badge */}
        <div className={`px-3 ${compact ? 'flex justify-center' : ''}`}>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${roleConfig.classes}`}>
            <RoleIcon className="w-3 h-3" />
            <span>{roleConfig.label}</span>
          </span>
        </div>

        {/* Logout Button */}
        {showLogoutButton && (
          <div className="px-3">
            <Button
              onClick={onLogout}
              variant="outline"
              className="w-full border-[#2d8659] text-[#2d8659] hover:bg-[#2d8659]/10 justify-center"
              size="sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Layout: row (desktop/horizontal) - default
  return (
    <div className="flex items-center gap-3">
      {/* User Info */}
      <div className="flex items-center gap-2">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2d8659] to-[#1d5c3b] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </div>

        {/* Name and Email (hide on very small screens) */}
        {!compact && (
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-800 truncate max-w-[150px]">{displayName}</p>
            <p className="text-xs text-gray-500 truncate max-w-[150px]">{user.email}</p>
          </div>
        )}
      </div>

      {/* Role Badge */}
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${roleConfig.classes}`}>
        <RoleIcon className="w-3 h-3" />
        <span className="hidden sm:inline">{roleConfig.label}</span>
      </span>

      {/* Logout Button */}
      {showLogoutButton && (
        <Button
          onClick={onLogout}
          variant="outline"
          className="border-[#2d8659] text-[#2d8659] hover:bg-[#2d8659]/10 h-9"
          size="sm"
        >
          <LogOut className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      )}
    </div>
  );
};

export default UserBadge;
