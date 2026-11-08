export type Employee = { id: string; name: string; active: boolean };
export type Shift = { id: string; employee_id: string; shift_date: string; start_time: string; end_time: string; note: string | null };
// Times are the restaurant's local clock, e.g. 2026-11-09T09:02:11
export type Attendance = { id: string; employee_id: string; clock_in: string; clock_out: string | null };
export type Review = { id: string; employee_id: string; review_date: string; rating: number; notes: string | null };

const HOUR = 3_600_000;
export const LATE_GRACE_MINUTES = 5;
// Clocking in this long before a shift still counts as attending it.
const EARLY_WINDOW = 2 * HOUR;

const toMs = (localTime: string) => Date.parse(`${localTime.slice(0, 19)}Z`);

export function shiftWindow(shift: Shift) {
  const start = toMs(`${shift.shift_date}T${shift.start_time}`);
  let end = toMs(`${shift.shift_date}T${shift.end_time}`);
  if (end <= start) end += 24 * HOUR; // finishes the next day
  return { start, end };
}

export const hoursWorked = (a: Attendance) => (a.clock_out ? (toMs(a.clock_out) - toMs(a.clock_in)) / HOUR : 0);
export const clockTime = (value: string) => value.slice(11, 16);
export const shiftTime = (value: string) => value.slice(0, 5);

export type EmployeeSummary = {
  employee: Employee;
  scheduled: number;
  attended: number;
  late: number;
  missed: number;
  hours: number;
  rating: number | null;
  reviews: number;
};

export function summarise(employees: Employee[], shifts: Shift[], attendance: Attendance[], reviews: Review[], today: string): EmployeeSummary[] {
  return employees.map((employee) => {
    const mine = attendance.filter((a) => a.employee_id === employee.id);
    let attended = 0;
    let late = 0;
    let scheduled = 0;

    for (const shift of shifts.filter((s) => s.employee_id === employee.id)) {
      const { start, end } = shiftWindow(shift);
      const match = mine.filter((a) => toMs(a.clock_in) >= start - EARLY_WINDOW && toMs(a.clock_in) <= end).sort((a, b) => toMs(a.clock_in) - toMs(b.clock_in))[0];
      if (match) {
        attended++;
        if (toMs(match.clock_in) > start + LATE_GRACE_MINUTES * 60_000) late++;
      }
      // Today's shifts only count once attended, because they may not have started.
      if (match || shift.shift_date < today) scheduled++;
    }

    const ratings = reviews.filter((r) => r.employee_id === employee.id).map((r) => r.rating);
    return {
      employee,
      scheduled,
      attended,
      late,
      missed: scheduled - attended,
      hours: mine.reduce((sum, a) => sum + hoursWorked(a), 0),
      rating: ratings.length ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null,
      reviews: ratings.length,
    };
  });
}
