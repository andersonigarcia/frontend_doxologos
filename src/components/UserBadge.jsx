import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck, Stethoscope, UserCircle, ChevronsUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

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
    label: 'Paciente', 
    classes: 'bg-gray-100 text-gray-800 border-gray-200', 
    Icon: UserCircle 
  }
};

/**
 * Retorna a rota canônica para cada papel
 * @param {string} role 
 * @returns {string} URL de destino
 */
export const getRedirectUrlForRole = (role) => {
  const normalized = typeof role === 'string' ? role.toLowerCase() : 'patient';
  switch (normalized) {
    case 'admin':
      return '/admin';
    case 'professional':
      return '/profissional';
    case 'patient':
    case 'user':
    default:
      return '/area-do-paciente';
  }
};

/**
 * UserBadge Component
 * Exibe informações do usuário com crachá de perfil, chaveador dinâmico para contas híbridas
 * e botão de logout.
 */
const UserBadge = ({
  user,
  userRole,
  onLogout,
  layout = 'row',
  showLogoutButton = true,
  compact = false
}) => {
  const navigate = useNavigate();

  // Acessa contexto de autenticação de forma resiliente
  let authContext = null;
  try {
    authContext = useAuth();
  } catch (e) {
    // Fora do AuthProvider (ex: testes isolados)
  }

  const availableRoles = authContext?.availableRoles || [];
  const switchActiveRole = authContext?.switchActiveRole;
  const isHybridUser = availableRoles.length > 1;
  const effectiveRole = userRole || authContext?.activeRole || authContext?.userRole || 'patient';

  // Memoize display name calculation
  const displayName = useMemo(() => {
    return user?.user_metadata?.full_name || 
           user?.user_metadata?.fullName || 
           user?.email?.split('@')[0] || 
           'Usuário';
  }, [user]);

  // Memoize role display config
  const roleConfig = useMemo(() => {
    const normalizedRole = typeof effectiveRole === 'string' 
      ? effectiveRole.toLowerCase() 
      : 'patient';
    return ROLE_DISPLAY[normalizedRole] || ROLE_DISPLAY.patient;
  }, [effectiveRole]);

  const handleBadgeClick = () => {
    navigate(getRedirectUrlForRole(effectiveRole));
  };

  const handleRoleSelect = (targetRole) => {
    if (switchActiveRole) {
      switchActiveRole(targetRole);
    }
    navigate(getRedirectUrlForRole(targetRole));
  };

  const RoleIcon = roleConfig.Icon;

  if (!user) return null;

  // Layout: column (mobile/vertical)
  if (layout === 'column') {
    return (
      <div className="flex flex-col gap-3 py-3">
        {/* User Info Section - Clicável */}
        <button
          onClick={handleBadgeClick}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${compact ? 'flex-col text-center' : ''}`}
        >
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1b3c37] to-[#132d29] flex items-center justify-center text-[#f0ebe1] font-bold flex-shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>

          {/* User Details */}
          <div className={compact ? 'w-full' : ''}>
            <p className="text-sm font-medium text-gray-800 truncate">{displayName}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </button>

        {/* Role Badge ou Profile Switcher */}
        <div className={`px-3 ${compact ? 'flex justify-center' : ''}`}>
          {isHybridUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-90 transition-all ${roleConfig.classes}`}
                  title="Clique para alternar de perfil"
                >
                  <RoleIcon className="w-3 h-3" />
                  <span>{roleConfig.label}</span>
                  <ChevronsUpDown className="w-3 h-3 opacity-60 ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56 bg-white shadow-xl border border-gray-100 p-1.5 rounded-xl z-50">
                <DropdownMenuLabel className="text-[11px] font-semibold text-gray-400 px-2 py-1 uppercase tracking-wider">
                  Alternar Modo de Navegação
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 bg-gray-100" />
                {availableRoles.map((role) => {
                  const config = ROLE_DISPLAY[role] || ROLE_DISPLAY.patient;
                  const Icon = config.Icon;
                  const isSelected = effectiveRole === role;
                  return (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => handleRoleSelect(role)}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer ${
                        isSelected ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-gray-500" />
                        <span>{config.label}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#2d8659]" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={handleBadgeClick}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity ${roleConfig.classes}`}
            >
              <RoleIcon className="w-3 h-3" />
              <span>{roleConfig.label}</span>
            </button>
          )}
        </div>

        {/* Logout Button */}
        {showLogoutButton && (
          <div className="px-3 pt-2">
            <Button
              onClick={onLogout}
              variant="outline"
              className="w-full border-[#1b3c37] text-[#1b3c37] hover:bg-[#1b3c37]/10"
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
      {/* User Info - Clicável */}
      <button
        onClick={handleBadgeClick}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1b3c37] to-[#132d29] flex items-center justify-center text-[#f0ebe1] font-bold text-sm flex-shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </div>

        {/* Name and Email (hide on very small screens) */}
        {!compact && (
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-800 truncate max-w-[150px]">{displayName}</p>
            <p className="text-xs text-gray-500 truncate max-w-[150px]">{user.email}</p>
          </div>
        )}
      </button>

      {/* Role Badge ou Profile Switcher */}
      {isHybridUser ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap cursor-pointer hover:opacity-90 transition-all ${roleConfig.classes}`}
              title="Clique para alternar de perfil"
            >
              <RoleIcon className="w-3 h-3" />
              <span className="hidden sm:inline">{roleConfig.label}</span>
              <ChevronsUpDown className="w-3 h-3 opacity-60 ml-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white shadow-xl border border-gray-100 p-1.5 rounded-xl z-50">
            <DropdownMenuLabel className="text-[11px] font-semibold text-gray-400 px-2 py-1 uppercase tracking-wider">
              Alternar Modo de Navegação
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 bg-gray-100" />
            {availableRoles.map((role) => {
              const config = ROLE_DISPLAY[role] || ROLE_DISPLAY.patient;
              const Icon = config.Icon;
              const isSelected = effectiveRole === role;
              return (
                <DropdownMenuItem
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer ${
                    isSelected ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-gray-500" />
                    <span>{config.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#2d8659]" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <button
          onClick={handleBadgeClick}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity ${roleConfig.classes}`}
        >
          <RoleIcon className="w-3 h-3" />
          <span className="hidden sm:inline">{roleConfig.label}</span>
        </button>
      )}

      {/* Logout Button */}
      {showLogoutButton && (
        <Button
          onClick={onLogout}
          variant="outline"
          className="border-[#1b3c37] text-[#1b3c37] hover:bg-[#1b3c37]/10 h-9"
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
