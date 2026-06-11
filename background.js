const ALARM_NAME = "leetcode_alarm";
const SNOOZE_ALARM_NAME = "leetcode_snooze_alarm";

let latestQuestion = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["settings"], (result) => {
    if (!result.settings) {
      chrome.storage.local.set({
        settings: {
          difficulty: "Easy",
          alarmType: "daily",
          alarmTime: "20:00",
          alarmDate: "",
          isEnabled: false,
          snoozeMinutes: 10
        }
      });
    }
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME || alarm.name === SNOOZE_ALARM_NAME) {
    const question = await getRandomQuestion();
    latestQuestion = question;

    if (!question) {
      showBasicNotification(
        "LeetCode Alarm",
        "No question found for your selected difficulty."
      );
      return;
    }

    chrome.storage.local.set({
      latestQuestion: question
    });

    chrome.notifications.create("leetcode_question_notification", {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: `Time to solve: ${question.title}`,
      message: `${question.difficulty} problem • ${question.topic}`,
      priority: 2,
      buttons: [
        {
          title: "Solve Now"
        },
        {
          title: "Snooze"
        }
      ]
    });
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === "leetcode_question_notification") {
    openLatestQuestion();
  }
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId !== "leetcode_question_notification") return;

  if (buttonIndex === 0) {
    openLatestQuestion();
  }

  if (buttonIndex === 1) {
    chrome.storage.local.get(["settings"], (result) => {
      const snoozeMinutes = result.settings?.snoozeMinutes || 10;

      chrome.alarms.create(SNOOZE_ALARM_NAME, {
        delayInMinutes: snoozeMinutes
      });

      showBasicNotification(
        "LeetCode Alarm Snoozed",
        `Reminder will come again in ${snoozeMinutes} minutes.`
      );
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SET_ALARM") {
    createLeetCodeAlarm(message.settings)
      .then(() => {
        sendResponse({
          success: true,
          message: "Alarm set successfully."
        });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          message: error.message
        });
      });

    return true;
  }

  if (message.type === "CANCEL_ALARM") {
    chrome.alarms.clear(ALARM_NAME);
    chrome.alarms.clear(SNOOZE_ALARM_NAME);

    chrome.storage.local.get(["settings"], (result) => {
      const updatedSettings = {
        ...result.settings,
        isEnabled: false
      };

      chrome.storage.local.set({
        settings: updatedSettings
      });

      sendResponse({
        success: true,
        message: "Alarm cancelled."
      });
    });

    return true;
  }

  if (message.type === "TEST_ALARM") {
    getRandomQuestion().then((question) => {
      latestQuestion = question;

      chrome.storage.local.set({
        latestQuestion: question
      });

      if (!question) {
        sendResponse({
          success: false,
          message: "No question found."
        });
        return;
      }

      chrome.notifications.create("leetcode_question_notification", {
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: `Test Alarm: ${question.title}`,
        message: `${question.difficulty} problem • ${question.topic}`,
        priority: 2,
        buttons: [
          {
            title: "Solve Now"
          },
          {
            title: "Snooze"
          }
        ]
      });

      sendResponse({
        success: true,
        question
      });
    });

    return true;
  }
});

async function createLeetCodeAlarm(settings) {
  await chrome.alarms.clear(ALARM_NAME);
  await chrome.alarms.clear(SNOOZE_ALARM_NAME);

  if (!settings.alarmTime) {
    throw new Error("Please select an alarm time.");
  }

  const [hour, minute] = settings.alarmTime.split(":").map(Number);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error("Invalid alarm time.");
  }

  let alarmDateTime;

  if (settings.alarmType === "once") {
    if (!settings.alarmDate) {
      throw new Error("Please select a date for one-time alarm.");
    }

    alarmDateTime = new Date(`${settings.alarmDate}T${settings.alarmTime}:00`);

    if (alarmDateTime.getTime() <= Date.now()) {
      throw new Error("Please select a future date and time.");
    }

    chrome.alarms.create(ALARM_NAME, {
      when: alarmDateTime.getTime()
    });
  } else {
    alarmDateTime = new Date();
    alarmDateTime.setHours(hour, minute, 0, 0);

    if (alarmDateTime.getTime() <= Date.now()) {
      alarmDateTime.setDate(alarmDateTime.getDate() + 1);
    }

    chrome.alarms.create(ALARM_NAME, {
      when: alarmDateTime.getTime(),
      periodInMinutes: 24 * 60
    });
  }

  const updatedSettings = {
    ...settings,
    isEnabled: true,
    nextAlarmAt: alarmDateTime.toISOString()
  };

  chrome.storage.local.set({
    settings: updatedSettings
  });
}

async function getRandomQuestion() {
  const settingsResult = await chrome.storage.local.get(["settings"]);
  const selectedDifficulty = settingsResult.settings?.difficulty || "Easy";

  const response = await fetch(chrome.runtime.getURL("questions.json"));
  const questions = await response.json();

  let filteredQuestions = questions;

  if (selectedDifficulty !== "Any") {
    filteredQuestions = questions.filter(
      (question) => question.difficulty === selectedDifficulty
    );
  }

  if (filteredQuestions.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * filteredQuestions.length);
  return filteredQuestions[randomIndex];
}

function openLatestQuestion() {
  chrome.storage.local.get(["latestQuestion"], (result) => {
    const question = result.latestQuestion || latestQuestion;

    if (!question || !question.url) {
      showBasicNotification(
        "LeetCode Alarm",
        "No question available to open."
      );
      return;
    }

    chrome.tabs.create({
      url: question.url
    });
  });
}

function showBasicNotification(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title,
    message,
    priority: 1
  });
}