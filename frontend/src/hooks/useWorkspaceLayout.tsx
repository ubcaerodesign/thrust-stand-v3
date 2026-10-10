import { useState, useEffect } from 'react';

export type ModuleId = 'gauges' | 'plot' | 'session' | 'sequence' | 'actuation';

export interface WorkspaceLayout {
  columnOrder: ['left', 'right'] | ['right', 'left'];
  leftModules: ModuleId[];
  rightModules: ModuleId[];
}

const DEFAULT_LAYOUT: WorkspaceLayout = {
  columnOrder: ['left', 'right'],
  leftModules: ['gauges'],
  rightModules: ['plot', 'session', 'sequence', 'actuation'],
};

const STORAGE_KEY = 'aerothrust_workspace_layout_v3';

export function useWorkspaceLayout() {
  const [layout, setLayout] = useState<WorkspaceLayout>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.leftModules && parsed.rightModules && parsed.columnOrder) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_LAYOUT;
  });

  const [draggedModule, setDraggedModule] = useState<ModuleId | null>(null);
  const [dropTargetModule, setDropTargetModule] = useState<ModuleId | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }, [layout]);

  const swapColumns = () => {
    setLayout((prev) => ({
      ...prev,
      columnOrder: prev.columnOrder[0] === 'left' ? ['right', 'left'] : ['left', 'right'],
    }));
  };

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
    localStorage.removeItem(STORAGE_KEY);
  };

  const moveModule = (id: ModuleId, action: 'swap_column' | 'move_up' | 'move_down') => {
    setLayout((prev) => {
      const inLeft = prev.leftModules.includes(id);
      let newLeft = [...prev.leftModules];
      let newRight = [...prev.rightModules];

      if (action === 'swap_column') {
        if (inLeft) {
          newLeft = newLeft.filter((m) => m !== id);
          newRight.push(id);
        } else {
          newRight = newRight.filter((m) => m !== id);
          newLeft.push(id);
        }
      } else if (action === 'move_up') {
        const list = inLeft ? newLeft : newRight;
        const idx = list.indexOf(id);
        if (idx > 0) {
          const temp = list[idx - 1];
          list[idx - 1] = list[idx];
          list[idx] = temp;
        }
      } else if (action === 'move_down') {
        const list = inLeft ? newLeft : newRight;
        const idx = list.indexOf(id);
        if (idx >= 0 && idx < list.length - 1) {
          const temp = list[idx + 1];
          list[idx + 1] = list[idx];
          list[idx] = temp;
        }
      }

      return {
        ...prev,
        leftModules: newLeft,
        rightModules: newRight,
      };
    });
  };

  const handleDragStart = (e: React.DragEvent, id: ModuleId) => {
    setDraggedModule(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: ModuleId) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggedModule && draggedModule !== targetId) {
      setDropTargetModule(targetId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: ModuleId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedModule || draggedModule === targetId) {
      setDraggedModule(null);
      setDropTargetModule(null);
      return;
    }

    setLayout((prev) => {
      const targetInLeft = prev.leftModules.includes(targetId);
      const newLeft = prev.leftModules.filter((m) => m !== draggedModule);
      const newRight = prev.rightModules.filter((m) => m !== draggedModule);

      if (targetInLeft) {
        const idx = newLeft.indexOf(targetId);
        newLeft.splice(idx, 0, draggedModule);
      } else {
        const idx = newRight.indexOf(targetId);
        newRight.splice(idx, 0, draggedModule);
      }

      return {
        ...prev,
        leftModules: newLeft,
        rightModules: newRight,
      };
    });

    setDraggedModule(null);
    setDropTargetModule(null);
  };

  const handleDropOnColumn = (e: React.DragEvent, column: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedModule) return;

    setLayout((prev) => {
      const newLeft = prev.leftModules.filter((m) => m !== draggedModule);
      const newRight = prev.rightModules.filter((m) => m !== draggedModule);

      if (column === 'left') {
        newLeft.push(draggedModule);
      } else {
        newRight.push(draggedModule);
      }

      return {
        ...prev,
        leftModules: newLeft,
        rightModules: newRight,
      };
    });

    setDraggedModule(null);
    setDropTargetModule(null);
  };

  const handleDragEnd = () => {
    setDraggedModule(null);
    setDropTargetModule(null);
  };

  return {
    layout,
    draggedModule,
    dropTargetModule,
    swapColumns,
    resetLayout,
    moveModule,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDropOnColumn,
    handleDragEnd,
  };
}