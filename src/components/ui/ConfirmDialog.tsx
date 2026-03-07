"use client";

import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  loading?: boolean;
  destructive?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmText = 'Confirm', loading = false, destructive = false }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="text-center">
        <div className={`inline-flex p-3 rounded-full mb-4 ${destructive ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
          <AlertTriangle className={`w-6 h-6 ${destructive ? 'text-red-400' : 'text-amber-400'}`} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-400 mb-6">{description}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              destructive ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30' : 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30'
            }`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
