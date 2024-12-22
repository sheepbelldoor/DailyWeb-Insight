const Paddle = require('@paddle/paddle-node');

class UserManager {
    constructor(paddleConfig) {
        this.paddle = new Paddle(paddleConfig);
    }

    async createUser(email) {
        try {
            const userData = {
                email,
                status: 'FREE',
                settings: this.getDefaultSettings(),
                createdAt: new Date().toISOString()
            };

            await chrome.storage.sync.set({ userData });
            return userData;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    getDefaultSettings() {
        return {
            emailNotifications: true,
            dailyReportTime: '18:00',
            productivityGoal: 60,
            categories: {
                'Social Media': ['facebook.com', 'twitter.com', 'instagram.com'],
                'Productivity': ['github.com', 'docs.google.com', 'notion.so'],
                'Entertainment': ['youtube.com', 'netflix.com', 'twitch.tv'],
                'Shopping': ['amazon.com', 'ebay.com', 'shopping.naver.com']
            }
        };
    }

    async upgradeSubscription(email) {
        try {
            const checkout = await this.paddle.createCheckout({
                items: [{
                    priceId: 'pri_premium_monthly',
                    quantity: 1
                }],
                customerEmail: email
            });

            return checkout.url;
        } catch (error) {
            console.error('Error creating subscription:', error);
            throw error;
        }
    }

    async handleWebhook(event) {
        switch (event.type) {
            case 'subscription.created':
                await this.updateUserStatus(event.customer.email, 'PREMIUM');
                break;
            case 'subscription.canceled':
                await this.updateUserStatus(event.customer.email, 'FREE');
                break;
        }
    }

    async updateUserStatus(email, status) {
        try {
            const { userData } = await chrome.storage.sync.get(['userData']);
            if (userData && userData.email === email) {
                userData.status = status;
                await chrome.storage.sync.set({ userData });
            }
        } catch (error) {
            console.error('Error updating user status:', error);
            throw error;
        }
    }

    async updateSettings(settings) {
        try {
            const { userData } = await chrome.storage.sync.get(['userData']);
            userData.settings = { ...userData.settings, ...settings };
            await chrome.storage.sync.set({ userData });
            return userData.settings;
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    }

    async getUserData() {
        try {
            const { userData } = await chrome.storage.sync.get(['userData']);
            return userData;
        } catch (error) {
            console.error('Error getting user data:', error);
            throw error;
        }
    }

    async isSubscriptionActive() {
        try {
            const { userData } = await chrome.storage.sync.get(['userData']);
            return userData?.status === 'PREMIUM';
        } catch (error) {
            console.error('Error checking subscription:', error);
            return false;
        }
    }
}

module.exports = UserManager; 