const alarmForm = document.getElementById("alarmForm");
const difficultyInput = document.getElementById("difficulty");
const alarmTypeInput = document.getElementById("alarmType");
const alarmDateInput = document.getElementById("alarmDate");
const alarmTimeInput = document.getElementById("alarmTime");
const snoozeMinutesInput = document.getElementById("snoozeMinutes");

const dateGroup = document.getElementById("dateGroup");
const alarmStatus = document.getElementById("alarmStatus");
const nextAlarmText = document.getElementById("nextAlarmText");
const message = document.getElementById("message");

const testAlarmBtn = document.getElementById("testAlarmBtn");
const cancelAlarmBtn = document.getElementById("cancelAlarmBtn");

const latestCard = document.getElementById("latestCard");
const latestTitle = document.getElementById("latestTitle");
const latestMeta = document.getElementById("latestMeta");
const openLatestBtn = document.getElementById("openLatestBtn");

let latestQuestionUrl = null;

document.addEventListener("DOMContentLoaded", loadSavedData);

alarmTypeInput.addEventListener("change", () => {
  toggleDateInput();
});

alarmForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const settings = {
    difficulty: difficultyInput.value,
    alarmType: alarmTypeInput.value,
    alarmDate: alarmDateInput.value,
    alarmTime: alarmTimeInput.value,
    snoozeMinutes: Number(snoozeMinutesInput.value),
    isEnabled: true
  };

  chrome.runtime.sendMessage(
    {
      type: "SET_ALARM",
      settings
    },
    (response) => {
      if (!response) {
        showMessage("Something went wrong.", "error");
        return;
      }

      if (response.success) {
        showMessage(response.message, "success");
        loadSavedData();
      } else {
        showMessage(response.message, "error");
      }
    }
  );
});

cancelAlarmBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage(
    {
      type: "CANCEL_ALARM"
    },
    (response) => {
      if (!response) {
        showMessage("Could not cancel alarm.", "error");
        return;
      }

      showMessage(response.message, "success");
      loadSavedData();
    }
  );
});

testAlarmBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage(
    {
      type: "TEST_ALARM"
    },
    (response) => {
      if (!response) {
        showMessage("Could not test alarm.", "error");
        return;
      }

      if (response.success) {
        showMessage("Test notification sent.", "success");
        loadSavedData();
      } else {
        showMessage(response.message, "error");
      }
    }
  );
});

openLatestBtn.addEventListener("click", () => {
  if (!latestQuestionUrl) {
    showMessage("No question found to open.", "error");
    return;
  }

  chrome.tabs.create({
    url: latestQuestionUrl
  });
});

function loadSavedData() {
  chrome.storage.local.get(["settings", "latestQuestion"], (result) => {
    const settings = result.settings || {
      difficulty: "Easy",
      alarmType: "daily",
      alarmDate: "",
      alarmTime: "20:00",
      snoozeMinutes: 10,
      isEnabled: false
    };

    difficultyInput.value = settings.difficulty || "Easy";
    alarmTypeInput.value = settings.alarmType || "daily";
    alarmDateInput.value = settings.alarmDate || "";
    alarmTimeInput.value = settings.alarmTime || "20:00";
    snoozeMinutesInput.value = String(settings.snoozeMinutes || 10);

    toggleDateInput();

    if (settings.isEnabled) {
      alarmStatus.textContent = "Alarm is active";

      if (settings.nextAlarmAt) {
        const nextDate = new Date(settings.nextAlarmAt);
        nextAlarmText.textContent = `Next alarm: ${nextDate.toLocaleString()}`;
      } else {
        nextAlarmText.textContent = "Alarm scheduled";
      }
    } else {
      alarmStatus.textContent = "Alarm is not active";
      nextAlarmText.textContent = "No alarm scheduled";
    }

    if (result.latestQuestion) {
      latestCard.classList.remove("hidden");
      latestTitle.textContent = result.latestQuestion.title;
      latestMeta.textContent = `${result.latestQuestion.difficulty} • ${result.latestQuestion.topic}`;
      latestQuestionUrl = result.latestQuestion.url;
    } else {
      latestCard.classList.add("hidden");
    }
  });
}

function toggleDateInput() {
  if (alarmTypeInput.value === "once") {
    dateGroup.classList.remove("hidden");
  } else {
    dateGroup.classList.add("hidden");
  }
}

function showMessage(text, type) {
  message.textContent = text;
  message.className = type;

  setTimeout(() => {
    message.textContent = "";
    message.className = "";
  }, 3000);
}