const UserManager = require('../../user/userManager');

// Mock Paddle
jest.mock('@paddle/paddle-node');

// Mock chrome.storage.sync
global.chrome = {
    storage: {
        sync: {
            get: jest.fn(),
            set: jest.fn()
        }
    }
};

describe('UserManager', () => {
    let userManager;
    const mockPaddleConfig = {
        apiKey: 'test_api_key',
        environment: 'sandbox'
    };

    beforeEach(() => {
        userManager = new UserManager(mockPaddleConfig);
        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('createUser', () => {
        it('should create a new user with default settings', async () => {
            const email = 'test@example.com';
            chrome.storage.sync.set.mockResolvedValueOnce(undefined);

            const result = await userManager.createUser(email);

            expect(result).toHaveProperty('email', email);
            expect(result).toHaveProperty('status', 'FREE');
            expect(result).toHaveProperty('settings');
            expect(result.settings).toHaveProperty('emailNotifications', true);
            expect(chrome.storage.sync.set).toHaveBeenCalled();
        });

        it('should throw error when storage fails', async () => {
            const email = 'test@example.com';
            chrome.storage.sync.set.mockRejectedValueOnce(new Error('Storage error'));

            await expect(userManager.createUser(email)).rejects.toThrow('Storage error');
        });
    });

    describe('upgradeSubscription', () => {
        it('should create a checkout session for subscription upgrade', async () => {
            const email = 'test@example.com';
            const mockCheckoutUrl = 'https://checkout.paddle.com/test';
            userManager.paddle.createCheckout = jest.fn().mockResolvedValueOnce({
                url: mockCheckoutUrl
            });

            const result = await userManager.upgradeSubscription(email);

            expect(result).toBe(mockCheckoutUrl);
            expect(userManager.paddle.createCheckout).toHaveBeenCalledWith({
                items: [{
                    priceId: 'pri_premium_monthly',
                    quantity: 1
                }],
                customerEmail: email
            });
        });
    });

    describe('updateUserStatus', () => {
        it('should update user status when email matches', async () => {
            const email = 'test@example.com';
            const status = 'PREMIUM';
            const mockUserData = {
                userData: { email, status: 'FREE' }
            };

            chrome.storage.sync.get.mockResolvedValueOnce(mockUserData);
            chrome.storage.sync.set.mockResolvedValueOnce(undefined);

            await userManager.updateUserStatus(email, status);

            expect(chrome.storage.sync.set).toHaveBeenCalledWith({
                userData: { email, status: 'PREMIUM' }
            });
        });

        it('should not update user status when email does not match', async () => {
            const email = 'test@example.com';
            const status = 'PREMIUM';
            const mockUserData = {
                userData: { email: 'other@example.com', status: 'FREE' }
            };

            chrome.storage.sync.get.mockResolvedValueOnce(mockUserData);

            await userManager.updateUserStatus(email, status);

            expect(chrome.storage.sync.set).not.toHaveBeenCalled();
        });
    });

    describe('getUserData', () => {
        it('should return user data from storage', async () => {
            const mockUserData = {
                userData: {
                    email: 'test@example.com',
                    status: 'FREE'
                }
            };

            chrome.storage.sync.get.mockResolvedValueOnce(mockUserData);

            const result = await userManager.getUserData();

            expect(result).toEqual(mockUserData.userData);
        });

        it('should handle storage error', async () => {
            chrome.storage.sync.get.mockRejectedValueOnce(new Error('Storage error'));

            await expect(userManager.getUserData()).rejects.toThrow('Storage error');
        });
    });

    describe('isSubscriptionActive', () => {
        it('should return true for PREMIUM status', async () => {
            chrome.storage.sync.get.mockResolvedValueOnce({
                userData: { status: 'PREMIUM' }
            });

            const result = await userManager.isSubscriptionActive();

            expect(result).toBe(true);
        });

        it('should return false for FREE status', async () => {
            chrome.storage.sync.get.mockResolvedValueOnce({
                userData: { status: 'FREE' }
            });

            const result = await userManager.isSubscriptionActive();

            expect(result).toBe(false);
        });
    });
}); 