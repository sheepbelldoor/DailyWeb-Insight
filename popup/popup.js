document.addEventListener('DOMContentLoaded', async () => {
    await initializePopup();
});

async function initializePopup() {
    const stats = await chrome.runtime.sendMessage({ type: 'GET_TODAY_STATS' });
    updateUI(stats);
    setupEventListeners();
}

function updateUI(stats) {
    updateTotalTime(stats.totalTime);
    updateTopSites(stats.topSites);
    updateCategoryChart(stats.categories);
    updateProductivityScore(stats.productivityScore);
    updateUserStatus();
}

function updateTotalTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    document.getElementById('total-time').innerHTML = `
        <h3>Total Time Online</h3>
        <p>${hours}h ${minutes}m</p>
    `;
}

function updateTopSites(sites) {
    const topSitesHtml = sites.map(site => `
        <div class="site-item">
            <img src="https://www.google.com/s2/favicons?domain=${site.domain}" alt="${site.domain}">
            <span>${site.domain}</span>
            <span>${Math.round(site.timeSpent / 60)}m</span>
        </div>
    `).join('');

    document.getElementById('top-sites').innerHTML = `
        <h3>Top Sites</h3>
        ${topSitesHtml}
    `;
}

function updateCategoryChart(categories) {
    // TODO: Implement chart visualization using a charting library
    const categoryList = Object.entries(categories)
        .map(([category, time]) => `
            <div class="category-item">
                <span>${category}</span>
                <span>${Math.round(time / 60)}m</span>
            </div>
        `).join('');

    document.getElementById('category-chart').innerHTML = categoryList;
}

function updateProductivityScore(score) {
    const meter = document.getElementById('productivity-meter');
    meter.style.background = `linear-gradient(to right, #4CAF50 ${score}%, #eee ${score}%)`;
}

function updateUserStatus() {
    chrome.storage.sync.get(['userStatus'], (result) => {
        const status = result.userStatus || 'FREE';
        document.getElementById('user-status').textContent = `Plan: ${status}`;
    });
}

function setupEventListeners() {
    document.getElementById('view-report').addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'GENERATE_REPORT' });
    });

    document.getElementById('settings').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
} 