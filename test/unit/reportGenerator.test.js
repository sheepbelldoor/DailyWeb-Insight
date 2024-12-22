const ReportGenerator = require('../../reports/reportGenerator');

// Mock dependencies
jest.mock('nodemailer');
jest.mock('openai');

describe('ReportGenerator', () => {
    let reportGenerator;
    const mockConfig = {
        apiKey: 'test_openai_key',
        emailConfig: {
            host: 'smtp.test.com',
            port: 587,
            secure: true,
            auth: {
                user: 'test@example.com',
                pass: 'test_password'
            }
        }
    };

    const mockStats = {
        totalTime: 3600,
        topSites: [
            { domain: 'github.com', timeSpent: 1800 },
            { domain: 'youtube.com', timeSpent: 900 }
        ],
        categories: {
            'Productivity': 1800,
            'Entertainment': 900
        },
        productivityScore: 67
    };

    beforeEach(() => {
        reportGenerator = new ReportGenerator(mockConfig.apiKey, mockConfig.emailConfig);
    });

    describe('generateReport', () => {
        it('should generate a complete report', async () => {
            const mockAnalysis = 'Mock analysis text';
            reportGenerator.openai.createCompletion = jest.fn().mockResolvedValueOnce({
                data: {
                    choices: [{ text: mockAnalysis }]
                }
            });

            const report = await reportGenerator.generateReport(mockStats);

            expect(report).toContain('Your Daily Web Insight Report');
            expect(report).toContain('1h 0m'); // Total time
            expect(report).toContain('github.com');
            expect(report).toContain('Productivity Score: 67%');
        });
    });

    describe('analyzeData', () => {
        it('should call OpenAI API with correct prompt', async () => {
            const mockResponse = {
                data: {
                    choices: [{ text: 'Analysis result' }]
                }
            };
            reportGenerator.openai.createCompletion = jest.fn().mockResolvedValueOnce(mockResponse);

            const result = await reportGenerator.analyzeData(mockStats);

            expect(reportGenerator.openai.createCompletion).toHaveBeenCalledWith({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "user",
                    content: expect.stringContaining('Analyze the following web browsing statistics')
                }],
                temperature: 0.7,
                max_tokens: 500
            });
            expect(result).toHaveProperty('analysis');
            expect(result).toHaveProperty('stats');
        });

        it('should handle OpenAI API errors', async () => {
            reportGenerator.openai.createCompletion = jest.fn().mockRejectedValueOnce(
                new Error('API Error')
            );

            await expect(reportGenerator.analyzeData(mockStats)).rejects.toThrow('API Error');
        });
    });

    describe('formatSummary', () => {
        it('should format time and sites correctly', () => {
            const data = {
                stats: mockStats
            };

            const summary = reportGenerator.formatSummary(data);

            expect(summary).toContain('1h 0m');
            expect(summary).toContain('github.com: 30m');
            expect(summary).toContain('youtube.com: 15m');
        });
    });

    describe('formatProductivity', () => {
        it('should format productivity score and categories correctly', () => {
            const data = {
                stats: mockStats
            };

            const productivity = reportGenerator.formatProductivity(data);

            expect(productivity).toContain('67%');
            expect(productivity).toContain('Productivity: 30m');
            expect(productivity).toContain('Entertainment: 15m');
        });
    });

    describe('sendReport', () => {
        it('should send email with correct options', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockResolvedValueOnce({ messageId: 'test_id' })
            };
            reportGenerator.transporter = mockTransporter;

            const email = 'user@example.com';
            const report = '<html>Test Report</html>';

            const result = await reportGenerator.sendReport(email, report);

            expect(result).toBe(true);
            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: 'DailyWeb Insight <noreply@dailywebinsight.com>',
                to: email,
                subject: 'Your Daily Web Activity Report',
                html: report
            });
        });

        it('should handle email sending errors', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockRejectedValueOnce(new Error('SMTP Error'))
            };
            reportGenerator.transporter = mockTransporter;

            const result = await reportGenerator.sendReport('test@example.com', 'report');

            expect(result).toBe(false);
        });
    });
}); 