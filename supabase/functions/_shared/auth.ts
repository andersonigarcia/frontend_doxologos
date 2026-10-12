// Supabase Edge Function Shared Helper - _shared/auth.ts
// Single Source of Truth para validação segura de RBAC (Onda 1)
// Em conformidade com ADR 005 (Multi-Perfil Híbrido) e OWASP Top 10.

import { User, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/**
 * Extrai os papéis (roles) do usuário priorizando estritamente app_metadata (RBAC seguro).
 * Em conformidade com ADR 005, verifica app_metadata.role e o array app_metadata.roles.
 * Recorre a user_metadata apenas como fallback defensivo para contas legadas.
 */
export function getUserRoles(user: User | null | undefined): string[] {
  if (!user) return [];

  const roles = new Set<string>();

  // 1. app_metadata.role (Single Source of Truth de RBAC seguro)
  if (user.app_metadata?.role) {
    roles.add(String(user.app_metadata.role).toLowerCase());
  }

  // 2. app_metadata.roles (Array de perfis múltiplos híbridos)
  if (Array.isArray(user.app_metadata?.roles)) {
    user.app_metadata.roles.forEach((r: unknown) => {
      if (r) roles.add(String(r).toLowerCase());
    });
  }

  // 3. Fallback defensivo retrocompatível para contas legadas
  if (roles.size === 0 && user.user_metadata?.role) {
    roles.add(String(user.user_metadata.role).toLowerCase());
  }

  return Array.from(roles);
}

/**
 * Verifica se o usuário possui cargo de administrador
 */
export function isAdminUser(user: User | null | undefined): boolean {
  const roles = getUserRoles(user);
  return roles.includes('admin') || roles.includes('superadmin');
}

/**
 * Verifica se o usuário possui qualquer uma das roles permitidas
 */
export function hasAnyRole(user: User | null | undefined, allowedRoles: Iterable<string>): boolean {
  const userRoles = getUserRoles(user);
  const allowedSet = new Set(Array.from(allowedRoles).map(r => r.toLowerCase()));
  return userRoles.some(r => allowedSet.has(r));
}

/**
 * Extrai e autentica o usuário a partir do header Authorization de uma Request
 */
export async function authenticateCaller(
  req: Request,
  supabaseAdmin: SupabaseClient
): Promise<{ user: User | null; token: string | null; error?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { user: null, token: null, error: 'Token de autorização não fornecido' };
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { user: null, token: null, error: 'Formato de token inválido' };
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return { user: null, token, error: userError?.message || 'Usuário não autenticado' };
  }

  return { user, token };
}

/**
 * Validador estrito de permissão de administrador para Edge Functions
 * Lança AuthError caso o usuário não seja autenticado (401) ou não seja admin (403)
 */
export async function requireAdmin(
  req: Request,
  supabaseAdmin: SupabaseClient
): Promise<{ user: User; token: string }> {
  const { user, token, error } = await authenticateCaller(req, supabaseAdmin);
  if (error || !user || !token) {
    throw new AuthError(error || 'Usuário não autenticado', 401);
  }

  if (!isAdminUser(user)) {
    throw new AuthError('Acesso negado. Apenas administradores podem acessar esta função.', 403);
  }

  return { user, token };
}

