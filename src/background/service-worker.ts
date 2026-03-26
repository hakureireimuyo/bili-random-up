/**
 * Background service worker initialization.
 */

export function initBackground(): void {
  console.log("[Background] Extension started");
  // if (typeof chrome === "undefined" || !chrome.alarms) {
  //   console.log("[Background] Alarms unavailable");
  // } else {
  //   scheduleAlarms(chrome.alarms);
  //   chrome.alarms.onAlarm.addListener((alarm) => {
  //     void handleAlarm(alarm);
  //   });
  // }

  // if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  //   chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  //     console.log("[Background] Received message:", message.type, message);
  //     void handleMessage(message)
  //       .then((result) => {
  //         console.log("[Background] Message handled, result:", result);
  //         sendResponse(result);
  //       })
  //       .catch((error) => {
  //         console.error("[Background] Message handling error:", error);
  //         sendResponse(null);
  //       });
  //     return true;
  //   });
  // }

}

if (typeof chrome !== "undefined") {
  initBackground();
}
