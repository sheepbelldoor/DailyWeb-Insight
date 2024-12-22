const request = require('supertest');
const app = require('../../server/server');

describe('API Integration Tests', () => {
    describe('POST /api/users', () => {
        it('should create a new user', async () => {
            const response = await request(app)
                .post('/api/users')
                .send({
                    email: 'test@example.com'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('email', 'test@example.com');
            expect(response.body).toHaveProperty('status', 'FREE');
            expect(response.body).toHaveProperty('settings');
        });

        it('should handle invalid email', async () => {
            const response = await request(app)
                .post('/api/users')
                .send({
                    email: 'invalid-email'
                });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /api/subscribe', () => {
        it('should create a subscription checkout session', async () => {
            const response = await request(app)
                .post('/api/subscribe')
                .send({
                    email: 'test@example.com'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('checkoutUrl');
            expect(response.body.checkoutUrl).toMatch(/^https:\/\/checkout\.paddle\.com/);
        });

        it('should handle subscription creation errors', async () => {
            const response = await request(app)
                .post('/api/subscribe')
                .send({
                    email: 'invalid@example.com'
                });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /api/reports/generate', () => {
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

        it('should generate and send a report', async () => {
            const response = await request(app)
                .post('/api/reports/generate')
                .send({
                    email: 'test@example.com',
                    stats: mockStats
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });

        it('should handle report generation errors', async () => {
            const response = await request(app)
                .post('/api/reports/generate')
                .send({
                    email: 'test@example.com',
                    stats: {} // Invalid stats
                });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /webhook/paddle', () => {
        const mockWebhookEvent = {
            alert_id: 'test_alert',
            event_type: 'subscription.created',
            customer: {
                email: 'test@example.com'
            }
        };

        it('should handle subscription webhook', async () => {
            const response = await request(app)
                .post('/webhook/paddle')
                .send(mockWebhookEvent);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });

        it('should handle invalid webhook data', async () => {
            const response = await request(app)
                .post('/webhook/paddle')
                .send({
                    invalid: 'data'
                });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });
    });
}); 