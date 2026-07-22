export const COMINS_COLUMN_MOUSE_DRAG_THRESHOLD = 6;

export type CominsColumnMouseIntent = "activate" | "cancel" | "pending";

export function getCominsColumnMouseIntent({
  clientX,
  clientY,
  startX,
  startY,
}: {
  clientX: number;
  clientY: number;
  startX: number;
  startY: number;
}): CominsColumnMouseIntent {
  const horizontalDelta = Math.abs(clientX - startX);
  const verticalDelta = Math.abs(clientY - startY);

  if (horizontalDelta >= COMINS_COLUMN_MOUSE_DRAG_THRESHOLD && horizontalDelta > verticalDelta) {
    return "activate";
  }

  if (verticalDelta >= COMINS_COLUMN_MOUSE_DRAG_THRESHOLD && verticalDelta >= horizontalDelta) {
    return "cancel";
  }

  return "pending";
}
