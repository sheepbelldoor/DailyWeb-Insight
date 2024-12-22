// State management
let activeTab = null;
let startTime = null;
let todayStats = {
    totalTime: 0,
    topSites: [],
    categories: {},
    productivityScore: 0
};

// Initialize
chrome.runtime.onInstalled.addListener(() => {
    initializeStorage();
    setupAlarms();
});

function initializeStorage() {
    chrome.storage.sync.get(['userStatus', 'categories'], (result) => {
        if (!result.userStatus) {
            chrome.storage.sync.set({ userStatus: 'FREE' });
        }
        if (!result.categories) {
            chrome.storage.sync.set({
                categories: {
                    'Social Media': ['facebook.com', 'twitter.com', 'instagram.com'],
                    'Productivity': ['github.com', 'docs.google.com', 'notion.so'],
                    'Entertainment': ['youtube.com', 'netflix.com', 'twitch.tv'],
                    'Shopping': ['amazon.com', 'ebay.com', 'shopping.naver.com']
                }
            });
        }
    });
}

// Tab tracking
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    handleTabChange(tab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        handleTabChange(tab);
    }
});

function handleTabChange(tab) {
    if (activeTab) {
        updateStats(activeTab, startTime, Date.now());
    }
    activeTab = tab;
    startTime = Date.now();
}

// Stats management
function updateStats(tab, start, end) {
    const duration = (end - start) / 1000;
    const domain = new URL(tab.url).hostname;

    todayStats.totalTime += duration;
    updateTopSites(domain, duration);
    updateCategories(domain, duration);
    calculateProductivityScore();
}

function updateTopSites(domain, duration) {
    const siteIndex = todayStats.topSites.findIndex(site => site.domain === domain);
    if (siteIndex >= 0) {
        todayStats.topSites[siteIndex].timeSpent += duration;
    } else {
        todayStats.topSites.push({ domain, timeSpent: duration });
    }
    todayStats.topSites.sort((a, b) => b.timeSpent - a.timeSpent);
    todayStats.topSites = todayStats.topSites.slice(0, 5);
}

async function updateCategories(domain, duration) {
    const categories = await chrome.storage.sync.get(['categories']);
    for (const [category, domains] of Object.entries(categories.categories)) {
        if (domains.some(d => domain.includes(d))) {
            todayStats.categories[category] = (todayStats.categories[category] || 0) + duration;
            break;
        }
    }
}

function calculateProductivityScore() {
    const productiveTime = todayStats.categories['Productivity'] || 0;
    const totalTime = todayStats.totalTime || 1;
    todayStats.productivityScore = Math.round((productiveTime / totalTime) * 100);
}

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
        case 'GET_TODAY_STATS':
            sendResponse(todayStats);
            break;
        case 'GENERATE_REPORT':
            generateReport();
            break;
    }
    return true;
});

// Report generation
async function generateReport() {
    const report = await formatReport();
    // TODO: Implement report generation using GPT API
    // TODO: Implement email sending
}

function formatReport() {
    return {
        date: new Date().toLocaleDateString(),
        stats: todayStats,
        recommendations: generateRecommendations()
    };
}

function generateRecommendations() {
    const recommendations = [];
    if (todayStats.productivityScore < 30) {
        recommendations.push('Consider setting website time limits for non-productive sites.');
    }
    // Add more recommendation logic
    return recommendations;
}

// Alarms for daily reset
function setupAlarms() {
    chrome.alarms.create('dailyReset', {
        when: getNextMidnight(),
        periodInMinutes: 24 * 60
    });
}

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'dailyReset') {
        resetDailyStats();
    }
});

function getNextMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime();
}

function resetDailyStats() {
    todayStats = {
        totalTime: 0,
        topSites: [],
        categories: {},
        productivityScore: 0
    };
} 