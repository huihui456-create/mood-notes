import React from 'react';

export function ConfirmModal({ title, text, onConfirm, onCancel, confirmText = '确定', danger = false }) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        {text && <div className="modal-text">{text}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>取消</button>
          <button className={`btn ${danger ? 'btn-danger-ghost' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}