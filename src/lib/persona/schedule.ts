import type {
  Availability,
  ScheduleBlock,
} from "@/lib/types/persona";

function toMinutes(hour: number, minute: number) {
  return hour * 60 + minute;
}

function isInBlock(now: Date, block: ScheduleBlock): boolean {
  const day = now.getDay();
  if (!block.days.includes(day)) return false;

  const current = toMinutes(now.getHours(), now.getMinutes());
  const start = toMinutes(block.startHour, block.startMinute);
  const end = toMinutes(block.endHour, block.endMinute);

  if (start <= end) {
    return current >= start && current < end;
  }
  return current >= start || current < end;
}

export function resolveSchedule(
  schedule: ScheduleBlock[],
  now = new Date()
): { availability: Availability; activity: string } {
  const active = schedule.find((block) => isInBlock(now, block));
  if (!active) {
    return { availability: "free", activity: "just chilling" };
  }

  if (active.label.toLowerCase().includes("sleep")) {
    return { availability: "sleeping", activity: active.label };
  }

  if (
    active.label.toLowerCase().includes("work") ||
    active.label.toLowerCase().includes("class")
  ) {
    return { availability: "busy", activity: active.label };
  }

  return { availability: "free", activity: active.label };
}
