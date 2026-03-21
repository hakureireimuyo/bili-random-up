import { ALARM_CLASSIFY_UPS, ALARM_UPDATE_UP_LIST, ALARM_DAILY_INTEREST, ALARM_WEEKLY_INTEREST, ALARM_MONTHLY_INTEREST, type AlarmLike, type AlarmManager, type BackgroundOptions } from "./common-types.js";
import { classifyUpTask } from "./classify-api.js";
import { updateUpListTask } from "./up-list.js";
import { createInterestManager } from "./interest-manager.js";

export function scheduleAlarms(alarms: AlarmManager): void {
  console.log("[Background] Schedule alarms");
  alarms.create(ALARM_UPDATE_UP_LIST, { periodInMinutes: 24 * 60 });
  alarms.create(ALARM_CLASSIFY_UPS, { periodInMinutes: 7 * 24 * 60 });
  alarms.create(ALARM_DAILY_INTEREST, { periodInMinutes: 24 * 60 });
  alarms.create(ALARM_WEEKLY_INTEREST, { periodInMinutes: 7 * 24 * 60 });
  alarms.create(ALARM_MONTHLY_INTEREST, { periodInMinutes: 30 * 24 * 60 });
}

export async function handleAlarm(
  alarm: AlarmLike,
  options: BackgroundOptions = {}
): Promise<void> {
  if (alarm.name === ALARM_UPDATE_UP_LIST) {
    await updateUpListTask(options);
    return;
  }
  if (alarm.name === ALARM_CLASSIFY_UPS) {
    await classifyUpTask(options);
    return;
  }
  if (alarm.name === ALARM_DAILY_INTEREST) {
    const interestManager = createInterestManager();
    await interestManager.runDailyTask();
    return;
  }
  if (alarm.name === ALARM_WEEKLY_INTEREST) {
    const interestManager = createInterestManager();
    await interestManager.runWeeklyTask();
    return;
  }
  if (alarm.name === ALARM_MONTHLY_INTEREST) {
    const interestManager = createInterestManager();
    await interestManager.runMonthlyTask();
  }
}
