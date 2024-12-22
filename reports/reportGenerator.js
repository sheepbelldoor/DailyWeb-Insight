const nodemailer = require('nodemailer');
const { Configuration, OpenAIApi } = require('openai');

class ReportGenerator {
    constructor(apiKey, emailConfig) {
        this.openai = new OpenAIApi(new Configuration({ apiKey }));
        this.transporter = nodemailer.createTransport(emailConfig);
    }

    async generateReport(stats) {
        const reportData = await this.analyzeData(stats);
        const htmlReport = await this.createHtmlReport(reportData);
        return htmlReport;
    }

    async analyzeData(stats) {
        const prompt = this.createAnalysisPrompt(stats);
        const response = await this.openai.createCompletion({
            model: "gpt-3.5-turbo",
            messages: [{
                role: "user",
                content: prompt
            }],
            temperature: 0.7,
            max_tokens: 500
        });

        return {
            analysis: response.data.choices[0].text,
            stats: stats
        };
    }

    createAnalysisPrompt(stats) {
        return `Analyze the following web browsing statistics and provide insights:
            Total time online: ${stats.totalTime} seconds
            Top sites: ${JSON.stringify(stats.topSites)}
            Categories: ${JSON.stringify(stats.categories)}
            Productivity score: ${stats.productivityScore}

            Please provide:
            1. A summary of the user's browsing habits
            2. Productivity insights
            3. Recommendations for improvement
            4. Notable patterns or trends`;
    }

    async createHtmlReport(data) {
        const template = await this.loadTemplate();
        return this.fillTemplate(template, data);
    }

    async loadTemplate() {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .section { margin-bottom: 30px; }
                    .chart { margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Your Daily Web Insight Report</h1>
                        <p>{{date}}</p>
                    </div>
                    <div class="section">
                        <h2>Today's Summary</h2>
                        {{summary}}
                    </div>
                    <div class="section">
                        <h2>Productivity Analysis</h2>
                        {{productivity}}
                    </div>
                    <div class="section">
                        <h2>Recommendations</h2>
                        {{recommendations}}
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    fillTemplate(template, data) {
        return template
            .replace('{{date}}', new Date().toLocaleDateString())
            .replace('{{summary}}', this.formatSummary(data))
            .replace('{{productivity}}', this.formatProductivity(data))
            .replace('{{recommendations}}', data.analysis);
    }

    formatSummary(data) {
        const hours = Math.floor(data.stats.totalTime / 3600);
        const minutes = Math.floor((data.stats.totalTime % 3600) / 60);
        
        return `
            <p>Total time online: ${hours}h ${minutes}m</p>
            <h3>Top Sites:</h3>
            <ul>
                ${data.stats.topSites.map(site => `
                    <li>${site.domain}: ${Math.round(site.timeSpent / 60)}m</li>
                `).join('')}
            </ul>
        `;
    }

    formatProductivity(data) {
        return `
            <p>Productivity Score: ${data.stats.productivityScore}%</p>
            <h3>Time by Category:</h3>
            <ul>
                ${Object.entries(data.stats.categories).map(([category, time]) => `
                    <li>${category}: ${Math.round(time / 60)}m</li>
                `).join('')}
            </ul>
        `;
    }

    async sendReport(email, report) {
        const mailOptions = {
            from: 'DailyWeb Insight <noreply@dailywebinsight.com>',
            to: email,
            subject: 'Your Daily Web Activity Report',
            html: report
        };

        try {
            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            return false;
        }
    }
}

module.exports = ReportGenerator; 