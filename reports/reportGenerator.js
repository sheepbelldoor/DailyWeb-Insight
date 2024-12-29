const fs = require('fs').promises;
const path = require('path');
const Mustache = require('mustache');
const moment = require('moment');
const { OpenAI } = require('openai');

class ReportGenerator {
    constructor(config) {
        this.templatesDir = path.join(__dirname, 'templates');
        this.openai = new OpenAI({ apiKey: config.openaiApiKey });
        this.templates = {};
    }

    async initialize() {
        // Load all templates
        const templateFiles = ['dailyReport.html', 'weeklyReport.html', 'monthlyReport.html'];
        for (const file of templateFiles) {
            const templatePath = path.join(this.templatesDir, file);
            this.templates[file] = await fs.readFile(templatePath, 'utf-8');
        }
    }

    async generateDailyReport(data) {
        const reportData = {
            date: moment(data.date).format('MMMM D, YYYY'),
            totalTime: this.formatDuration(data.totalTime),
            productivityScore: Math.round(data.productivityScore),
            sitesVisited: data.uniqueSites,
            topSites: data.topSites.map(site => ({
                domain: site.domain,
                timeSpent: this.formatDuration(site.timeSpent)
            })),
            categories: data.categories.map(cat => ({
                name: cat.name,
                time: this.formatDuration(cat.time),
                percentage: Math.round(cat.percentage)
            })),
            analysis: await this.generateInsights(data, 'daily'),
            recommendations: await this.generateRecommendations(data, 'daily')
        };

        return Mustache.render(this.templates['dailyReport.html'], reportData);
    }

    async generateWeeklyReport(data) {
        const reportData = {
            weekRange: `${moment(data.startDate).format('MMM D')} - ${moment(data.endDate).format('MMM D, YYYY')}`,
            totalTime: this.formatDuration(data.totalTime),
            avgDailyTime: this.formatDuration(data.avgDailyTime),
            avgProductivityScore: Math.round(data.avgProductivityScore),
            uniqueSites: data.uniqueSites,
            totalTimeChange: this.formatChange(data.totalTimeChange),
            avgTimeChange: this.formatChange(data.avgTimeChange),
            productivityChange: this.formatChange(data.productivityChange),
            sitesChange: this.formatChange(data.sitesChange),
            totalTimeTrend: data.totalTimeChange >= 0 ? 'up' : 'down',
            avgTimeTrend: data.avgTimeChange >= 0 ? 'up' : 'down',
            productivityTrend: data.productivityChange >= 0 ? 'up' : 'down',
            sitesTrend: data.sitesChange >= 0 ? 'up' : 'down',
            days: data.dailyStats.map(day => ({
                dayName: moment(day.date).format('dddd'),
                totalTime: this.formatDuration(day.totalTime),
                productivityScore: Math.round(day.productivityScore)
            })),
            topSites: data.topSites.map(site => ({
                domain: site.domain,
                totalTime: this.formatDuration(site.totalTime),
                visitsCount: site.visits,
                avgTimePerVisit: this.formatDuration(site.avgTimePerVisit),
                productivityImpact: this.formatProductivityImpact(site.productivityImpact)
            })),
            categories: data.categories.map(cat => ({
                name: cat.name,
                time: this.formatDuration(cat.time),
                percentage: Math.round(cat.percentage)
            })),
            insights: await this.generateInsights(data, 'weekly'),
            actions: await this.generateRecommendations(data, 'weekly')
        };

        return Mustache.render(this.templates['weeklyReport.html'], reportData);
    }

    async generateMonthlyReport(data) {
        const reportData = {
            monthYear: moment(data.date).format('MMMM YYYY'),
            totalTime: this.formatDuration(data.totalTime),
            avgDailyTime: this.formatDuration(data.avgDailyTime),
            avgProductivityScore: Math.round(data.avgProductivityScore),
            uniqueSites: data.uniqueSites,
            totalTimeChange: this.formatChange(data.totalTimeChange),
            avgTimeChange: this.formatChange(data.avgTimeChange),
            productivityChange: this.formatChange(data.productivityChange),
            sitesChange: this.formatChange(data.sitesChange),
            totalTimeTrend: data.totalTimeChange >= 0 ? 'up' : 'down',
            avgTimeTrend: data.avgTimeChange >= 0 ? 'up' : 'down',
            productivityTrend: data.productivityChange >= 0 ? 'up' : 'down',
            sitesTrend: data.sitesChange >= 0 ? 'up' : 'down',
            dailyUsageChart: this.generateChartData(data.dailyStats),
            productivityChart: this.generateChartData(data.productivityStats),
            hourlyProductivityChart: this.generateChartData(data.hourlyStats),
            topSites: data.topSites.map(site => ({
                domain: site.domain,
                totalTime: this.formatDuration(site.totalTime),
                visitsCount: site.visits,
                avgTimePerVisit: this.formatDuration(site.avgTimePerVisit)
            })),
            categories: data.categories.map(cat => ({
                name: cat.name,
                time: this.formatDuration(cat.time),
                percentage: Math.round(cat.percentage)
            })),
            comparisons: this.generateComparisons(data),
            insights: await this.generateInsights(data, 'monthly'),
            recommendations: await this.generateRecommendations(data, 'monthly')
        };

        return Mustache.render(this.templates['monthlyReport.html'], reportData);
    }

    formatDuration(minutes) {
        if (minutes < 60) {
            return `${Math.round(minutes)}m`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.round(minutes % 60);
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }

    formatChange(value) {
        const absValue = Math.abs(value);
        return value >= 0 ? `+${absValue}%` : `-${absValue}%`;
    }

    formatProductivityImpact(impact) {
        if (impact > 0) return `+${impact}% productivity`;
        if (impact < 0) return `${impact}% productivity`;
        return 'Neutral impact';
    }

    generateChartData(data) {
        // 실제 차트 라이브러리에 맞는 데이터 포맷으로 변환
        // 이 예제에서는 차트 데이터를 문자열로 반환
        return JSON.stringify(data);
    }

    generateComparisons(data) {
        return [
            {
                metric: 'Productive Time',
                currentValue: this.formatDuration(data.productiveTime),
                previousValue: this.formatDuration(data.previousProductiveTime),
                change: this.formatChange(data.productiveTimeChange)
            },
            {
                metric: 'Most Visited Site',
                currentValue: data.topSites[0].domain,
                previousValue: data.previousTopSite,
                change: data.topSiteChange
            },
            {
                metric: 'Peak Productivity Hours',
                currentValue: `${data.peakHours.current.start}-${data.peakHours.current.end}`,
                previousValue: `${data.peakHours.previous.start}-${data.peakHours.previous.end}`,
                change: 'N/A'
            }
        ];
    }

    async generateInsights(data, reportType) {
        try {
            const prompt = this.createInsightPrompt(data, reportType);
            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [{
                    role: "user",
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 500
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error generating insights:', error);
            return 'Unable to generate insights at this time.';
        }
    }

    async generateRecommendations(data, reportType) {
        try {
            const prompt = this.createRecommendationPrompt(data, reportType);
            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [{
                    role: "user",
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 500
            });

            return response.choices[0].message.content.split('\n').filter(r => r.trim());
        } catch (error) {
            console.error('Error generating recommendations:', error);
            return ['Focus on maintaining a balanced online schedule'];
        }
    }

    createInsightPrompt(data, reportType) {
        return `Analyze the following ${reportType} web usage data and provide key insights:
        - Total time online: ${data.totalTime} minutes
        - Productivity score: ${data.productivityScore}%
        - Top sites: ${JSON.stringify(data.topSites)}
        - Category distribution: ${JSON.stringify(data.categories)}
        Please provide 3-4 key insights about the user's web usage patterns and productivity.`;
    }

    createRecommendationPrompt(data, reportType) {
        return `Based on the following ${reportType} web usage data:
        - Total time online: ${data.totalTime} minutes
        - Productivity score: ${data.productivityScore}%
        - Top sites: ${JSON.stringify(data.topSites)}
        - Category distribution: ${JSON.stringify(data.categories)}
        Please provide 3-4 actionable recommendations to improve productivity and maintain a healthy online balance.`;
    }
}

module.exports = ReportGenerator; 