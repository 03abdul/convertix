import { useState } from 'react';

/**
 * Native drag-and-drop reordering for a list. Spread `getItemProps(index)` on each item and
 * use `dragIndex` / `overIndex` for styling. File drags from outside the page are ignored.
 * Keep keyboard-accessible move buttons next to it: drag and drop is not available to everyone.
 */
export function useDragReorder(onMove) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const reset = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const getItemProps = (index) => ({
    draggable: true,
    onDragStart: (event) => {
      setDragIndex(index);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    },
    onDragOver: (event) => {
      if (dragIndex === null) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      if (overIndex !== index) setOverIndex(index);
    },
    onDrop: (event) => {
      if (dragIndex === null) return;
      event.preventDefault();
      if (dragIndex !== index) onMove(dragIndex, index);
      reset();
    },
    onDragEnd: reset,
  });

  const itemClass = (index) => {
    if (dragIndex === index) return 'opacity-40';
    if (dragIndex !== null && overIndex === index) return 'ring-2 ring-secondary-400';
    return '';
  };

  return { getItemProps, itemClass, dragIndex, overIndex };
}
