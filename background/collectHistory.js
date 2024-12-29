class HistoryCollector {
    constructor() {
        this.setupListeners();
    }

    setupListeners() {
        chrome.history.onVisited.addListener(this.handleVisit.bind(this));
    }

    async handleVisit(historyItem) {
        try {
            // Ignore internal Chrome URLs
            if (historyItem.url.startsWith('chrome://')) {
                return;
            }

            // Initialize state if needed
            await this.initializeState();

            const tab = await this.getActiveTab();
            if (!tab || tab.url !== historyItem.url) {
                return;
            }

            await this.processVisit(historyItem);
        } catch (error) {
            console.error('Error handling visit:', error);
        }
    }

    async initializeState() {
        const result = await chrome.storage.sync.get(['todayStats']);
        if (!result || !result.todayStats) {
            await chrome.storage.sync.set({
                todayStats: {
                    totalTime: 0,
                    topSites: [],
                    categories: {},
                    productivityScore: 0
                }
            });
        }
    }

    async getActiveTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
    }

    async processVisit(historyItem) {
        const categories = await this.getCategories();
        const category = this.categorizeUrl(historyItem.url, categories);
        
        const visits = await chrome.history.getVisits({ url: historyItem.url });
        const timeSpent = this.calculateTimeSpent(visits);

        await this.updateStats(historyItem, category, timeSpent);
    }

    async getCategories() {
        const result = await chrome.storage.sync.get(['categories']);
        return result.categories || {};
    }

    categorizeUrl(url, categories) {
        const domain = new URL(url).hostname;
        
        for (const [category, domains] of Object.entries(categories)) {
            if (domains.some(d => domain.includes(d))) {
                return category;
            }
        }
        
        return 'Uncategorized';
    }

    calculateTimeSpent(visits) {
        if (visits.length < 2) return 0;
        
        // 가장 최근 방문 시간과 첫 방문 시간의 차이를 계산
        const lastVisit = visits[visits.length - 1];
        const firstVisit = visits[0];
        const duration = lastVisit.visitTime - firstVisit.visitTime;
        
        // 1시간(3600000ms) 이상의 간격은 무시
        return duration;
    }

    async updateStats(historyItem, category, timeSpent) {
        const stats = await this.getCurrentStats();
        
        // Update total time
        stats.totalTime += timeSpent;

        // Update top sites
        this.updateTopSites(stats, historyItem.url, timeSpent);

        // Update categories
        if (!stats.categories[category]) {
            stats.categories[category] = 0;
        }
        stats.categories[category] += timeSpent;

        await chrome.storage.sync.set({ todayStats: stats });
    }

    async getCurrentStats() {
        const defaultStats = {
            totalTime: 0,
            topSites: [],
            categories: {},
            productivityScore: 0
        };

        try {
            const result = await chrome.storage.sync.get(['todayStats']);
            return result && result.todayStats ? result.todayStats : defaultStats;
        } catch (error) {
            console.error('Error getting current stats:', error);
            return defaultStats;
        }
    }

    updateTopSites(stats, url, timeSpent) {
        const domain = new URL(url).hostname;
        const existingSite = stats.topSites.find(site => site.domain === domain);

        if (existingSite) {
            existingSite.timeSpent += timeSpent;
        } else {
            stats.topSites.push({ domain, timeSpent });
        }

        // Sort and limit to top 5
        stats.topSites.sort((a, b) => b.timeSpent - a.timeSpent);
        stats.topSites = stats.topSites.slice(0, 5);
    }

    async cleanupOldHistory(days = 30) {
        try {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);

            const oldItems = await chrome.history.search({
                text: '',
                startTime: 0,
                endTime: cutoff.getTime(),
                maxResults: 1000
            });

            for (const item of oldItems) {
                try {
                    await chrome.history.deleteUrl({ url: item.url });
                } catch (error) {
                    console.error('Error deleting URL:', error);
                }
            }
        } catch (error) {
            console.error('Error cleaning up history:', error);
        }
    }
}

module.exports = HistoryCollector; 