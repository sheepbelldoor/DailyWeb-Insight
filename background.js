// 웹사이트 방문 기록 추적
chrome.history.onVisited.addListener(function(historyItem) {
  chrome.history.getVisits({url: historyItem.url}, function(visitItems) {
    if (visitItems.length > 0) {
      const visitTime = new Date(visitItems[visitItems.length - 1].visitTime);
      saveVisit(historyItem.url, visitTime);
    }
  });
});

// 웹사이트 체류 시간 계산
let currentTab = null;
let startTime = null;

chrome.tabs.onActivated.addListener(function(activeInfo) {
  if (currentTab) {
    const endTime = new Date();
    const duration = endTime - startTime;
    saveVisitDuration(currentTab, duration);
  }
  
  chrome.tabs.get(activeInfo.tabId, function(tab) {
    currentTab = tab.url;
    startTime = new Date();
  });
});

// 데이터 저장 함수
function saveVisit(url, time) {
  chrome.storage.local.get({visits: {}}, function(result) {
    const visits = result.visits;
    if (!visits[url]) {
      visits[url] = {count: 0, totalTime: 0};
    }
    visits[url].count++;
    chrome.storage.local.set({visits: visits});
  });
}

function saveVisitDuration(url, duration) {
  chrome.storage.local.get({visits: {}}, function(result) {
    const visits = result.visits;
    if (visits[url]) {
      visits[url].totalTime += duration;
      chrome.storage.local.set({visits: visits});
    }
  });
}

// 매일 자정에 데이터 초기화 및 리포트 생성
chrome.alarms.create("dailyReset", {
  when: getNextMidnight(),
  periodInMinutes: 24 * 60
});

chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === "dailyReset") {
    generateDailyReport();
    resetData();
  }
});

function getNextMidnight() {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return nextMidnight.getTime();
}

function generateDailyReport() {
  // 리포트 생성 로직 구현
  // (이 부분은 별도의 함수로 구현하여 popup.js에서도 사용할 수 있게 합니다)
}

function resetData() {
  chrome.storage.local.set({visits: {}});
}

