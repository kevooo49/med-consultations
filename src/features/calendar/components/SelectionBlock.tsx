type Props = {
  startSlot: number;
  endSlot: number;
};

export function SelectionBlock({ startSlot, endSlot }: Props) {
  const top = Math.min(startSlot, endSlot) * 60;
  const height = (Math.abs(endSlot - startSlot) + 1) * 60;

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 6,
        right: 6,
        height,
        borderRadius: 10,
        background: "rgba(59, 130, 246, 0.35)", // blue-500
        border: "2px dashed #2563eb",
        zIndex: 5,
        pointerEvents: "none",
      }}
    />
  );
}
