import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { PasswordStrengthMeter, isPasswordValid } from './PasswordStrengthMeter';
import { auditLogger, AuditAction } from '@/lib/auditLogger';

export function ChangePasswordModal({ isOpen, onClose }) {
  const { updatePassword, user } = useAuth();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValid = isPasswordValid(newPassword) && newPassword === confirmPassword && confirmPassword.length > 0;

  const handleResetForm = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValid) {
      toast({
        variant: 'destructive',
        title: 'Senha Inválida',
        description: 'Verifique se a nova senha atende a todos os requisitos de segurança e se a confirmação coincide.',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await updatePassword(newPassword);

      if (error) {
        throw error;
      }

      await auditLogger.info(AuditAction.PASSWORD_CHANGE, {
        resourceType: 'user',
        resourceId: user?.id,
        details: {
          email: user?.email,
          timestamp: new Date().toISOString()
        }
      });

      toast({
        title: '🎉 Senha Atualizada com Sucesso!',
        description: 'Sua senha foi alterada e sua conta está protegida pelos novos padrões de segurança.',
      });

      handleClose();
    } catch (err) {
      console.error('Erro ao atualizar senha:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao Atualizar Senha',
        description: err.message || 'Não foi possível alterar sua senha neste momento. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-white rounded-2xl p-6 space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-[#2d8659]">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5 text-[#2d8659]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Alterar Minha Senha
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Atualize sua senha para estar em conformidade com o padrão de segurança LGPD/HIPAA.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Nova Senha */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Nova Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Digite a nova senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-9 pr-9 text-sm"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar Nova Senha */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Confirmar Nova Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Digite a nova senha novamente"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-9 pr-9 text-sm"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Medidor de Força e Checklist */}
          {newPassword && (
            <PasswordStrengthMeter password={newPassword} />
          )}

          {confirmPassword && confirmPassword !== newPassword && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
              ⚠️ As senhas digitadas não coincidem.
            </p>
          )}

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={loading}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !isValid}
              className="bg-[#2d8659] hover:bg-[#236b47] text-white font-bold text-xs shadow-md"
            >
              {loading ? 'Atualizando...' : 'Salvar Nova Senha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ChangePasswordModal;
