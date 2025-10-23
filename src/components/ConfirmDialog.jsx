import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  warningMessage, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  type = "danger" // danger, warning, info
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-blue-500" />;
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'danger':
        return "bg-red-600 hover:bg-red-700";
      case 'warning':
        return "bg-yellow-600 hover:bg-yellow-700";
      default:
        return "bg-blue-600 hover:bg-blue-700";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getIcon()}
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-gray-700 mb-3">{message}</p>
          
          {warningMessage && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>Atenção:</strong>
                  <p className="mt-1 whitespace-pre-line">{warningMessage}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button 
            onClick={onConfirm} 
            className={getButtonClass()}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;