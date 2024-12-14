document.addEventListener('DOMContentLoaded', function() {
  updateSummary();
  updateCategoryChart();
  updateTopSites();

  document.getElementById('downloadReport').addEventListener('click', downloadPDFReport);
});

function updateSummary() {
  chrome.storage.local.get({visits: {}}, function(result) {
    const visits = result.visits;
    let totalTime = 0;
    let productiveTime = 0;

    for (let url in visits) {
      totalTime += visits[url].totalTime;
      if (isProductiveURL(url)) {
        productiveTime += visits[url].totalTime;
      }
    }

    const totalTimeFormatted = formatTime(totalTime);
    const productivityScore = Math.round((productiveTime / totalTime) * 100);

    document.getElementById('totalTime').textContent = totalTimeFormatted;
    document.getElementById('productivityScore').textContent = productivityScore + '%';
  });
}

function updateCategoryChart() {
  chrome.storage.local.get({visits: {}}, function(result) {
    const visits = result.visits;
    const categories = {
      'Work': 0,
      'Social': 0,
      'Entertainment': 0,
      'Other': 0
    };

    for (let url in visits) {
      const category = getCategoryForURL(url);
      categories[category] += visits[url].totalTime;
    }

    const ctx = document.getElementById('pieChart').getContext('2d');
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(categories),
        datasets: [{
          data: Object.values(categories),
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
        }]
      }
    });
  });
}

function updateTopSites() {
  chrome.storage.local.get({visits: {}}, function(result) {
    const visits = result.visits;
    const sortedSites = Object.entries(visits)
      .sort((a, b) => b[1].totalTime - a[1].totalTime)
      .slice(0, 5);

    const topSitesList = document.getElementById('topSitesList');
    topSitesList.innerHTML = '';

    sortedSites.forEach(([url, data], index) => {
      const li = document.createElement('li');
      li.textContent = `${index + 1}. ${new URL(url).hostname} (${formatTime(data.totalTime)})`;
      topSitesList.appendChild(li);
    });
  });
}

function downloadPDFReport() {
  // PDF 리포트 생성 및 다운로드 로직 구현
  // (jsPDF 라이브러리를 사용하여 구현할 수 있습니다)
}

function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return `${hours}시간 ${minutes % 60}분`;
}

function isProductiveURL(url) {
  // URL이 생산적인지 판단하는 로직 구현
  // (예: 업무 관련 도메인 목록을 만들어 체크)
}

function getCategoryForURL(url) {
  // URL의 카테고리를 반환하는 로직 구현
  // (예: 도메인별로 카테고리 매핑)
}

