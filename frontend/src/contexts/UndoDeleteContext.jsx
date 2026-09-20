import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import TimeUndoAction from '../components/ui/time-undo-action';

const UNDO_DELETE_DELAY_MS = 7000;

const UndoDeleteContext = createContext();

export const UndoDeleteProvider = ({ children }) => {
  const [pendingDelete, setPendingDelete] = useState(null);
  const timerRef = useRef(null);
  const pendingDeleteRef = useRef(null);
  pendingDeleteRef.current = pendingDelete;

  // Immediately commit pending delete action
  const commitPendingDeleteNow = async () => {
    const current = pendingDeleteRef.current;
    if (!current) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setPendingDelete(null);

    try {
      await current.onCommit();
    } catch (err) {
      console.error(`[UndoDelete] Commit failed for ${current.type} (${current.id}):`, err);
      if (current.onFailure) current.onFailure(err);
      if (current.onRestore) current.onRestore();
    }
  };

  // Request an undoable delete operation
  const requestUndoableDelete = async ({
    id,
    type = 'Item',
    label,
    itemData,
    onOptimisticRemove,
    onRestore,
    onCommit,
    onFailure,
    delayMs = UNDO_DELETE_DELAY_MS
  }) => {
    // Single pending delete rule: if one is already pending, commit it immediately
    if (pendingDeleteRef.current) {
      await commitPendingDeleteNow();
    }

    // 1. Optimistically remove/hide item in UI
    if (onOptimisticRemove) {
      onOptimisticRemove();
    }

    const actionLabel = label || type;

    const action = {
      id,
      type,
      label: actionLabel,
      itemData,
      onOptimisticRemove,
      onRestore,
      onCommit,
      onFailure,
      durationMs: delayMs
    };

    setPendingDelete(action);

    // 2. Schedule delayed backend delete
    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      setPendingDelete(null);

      try {
        await onCommit();
      } catch (err) {
        console.error(`[UndoDelete] Delayed commit failed for ${type} (${id}):`, err);
        if (onFailure) onFailure(err);
        if (onRestore) onRestore();
      }
    }, delayMs);
  };

  // Handle user clicking UNDO
  const handleUndo = () => {
    const current = pendingDeleteRef.current;
    if (!current) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Restore item in UI
    if (current.onRestore) {
      current.onRestore();
    }

    setPendingDelete(null);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <UndoDeleteContext.Provider value={{ requestUndoableDelete, handleUndo, pendingDelete }}>
      {children}
      {pendingDelete && (
        <TimeUndoAction
          label={pendingDelete.label}
          initialSeconds={Math.ceil(pendingDelete.durationMs / 1000)}
          onUndo={handleUndo}
          onTimerComplete={commitPendingDeleteNow}
        />
      )}
    </UndoDeleteContext.Provider>
  );
};

export const useUndoableDelete = () => {
  const context = useContext(UndoDeleteContext);
  if (!context) {
    throw new Error('useUndoableDelete must be used within an UndoDeleteProvider');
  }
  return context;
};

export default UndoDeleteContext;
