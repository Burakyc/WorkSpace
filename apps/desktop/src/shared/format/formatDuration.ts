/** Minutes as Turkish short text: "0 dk", "45 dk", "2 sa", "2 sa 5 dk". */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes} dk`;
  }
  return minutes === 0 ? `${hours} sa` : `${hours} sa ${minutes} dk`;
}
