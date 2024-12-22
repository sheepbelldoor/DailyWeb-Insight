// Mock chrome API
global.chrome = {
    runtime: {
        onInstalled: {
            addListener: jest.fn()
        },
        onMessage: {
            addListener: jest.fn()
        }
    },
    tabs: {
        onActivated: {
            addListener: jest.fn()
        },
        onUpdated: {
            addListener: jest.fn()
        },
        get: jest.fn()
    },
    storage: {
        sync: {
            get: jest.fn(),
            set: jest.fn()
        }
    },
    alarms: {
        create: jest.fn(),
        onAlarm: {
            addListener: jest.fn()
        }
    }
};

describe('Background Script', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        
        // Reset state before each test
        require('../../background/background');
    });

    describe('Initialization', () => {
        it('should set up event listeners on install', () => {
            expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled();
            expect(chrome.tabs.onActivated.addListener).toHaveBeenCalled();
            expect(chrome.tabs.onUpdated.addListener).toHaveBeenCalled();
        });

        it('should initialize storage with default values', () => {
            // Get the installation callback
            const installCallback = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
            installCallback();

            expect(chrome.storage.sync.get).toHaveBeenCalledWith(['userStatus', 'categories']);
        });
    });

    describe('Tab Tracking', () => {
        it('should handle tab activation', async () => {
            const mockTab = {
                id: 1,
                url: 'https://github.com',
                active: true
            };
            chrome.tabs.get.mockResolvedValueOnce(mockTab);

            // Get the tab activated callback
            const activatedCallback = chrome.tabs.onActivated.addListener.mock.calls[0][0];
            await activatedCallback({ tabId: 1 });

            expect(chrome.tabs.get).toHaveBeenCalledWith(1);
        });

        it('should handle tab updates', () => {
            const mockTab = {
                id: 1,
                url: 'https://github.com',
                active: true
            };

            // Get the tab updated callback
            const updatedCallback = chrome.tabs.onUpdated.addListener.mock.calls[0][0];
            updatedCallback(1, { status: 'complete' }, mockTab);
        });
    });

    describe('Stats Management', () => {
        it('should update stats when tab changes', async () => {
            const mockTab = {
                id: 1,
                url: 'https://github.com',
                active: true
            };

            // Mock storage response for categories
            chrome.storage.sync.get.mockResolvedValueOnce({
                categories: {
                    'Productivity': ['github.com']
                }
            });

            // Get the tab activated callback
            const activatedCallback = chrome.tabs.onActivated.addListener.mock.calls[0][0];
            chrome.tabs.get.mockResolvedValueOnce(mockTab);
            
            // Simulate tab change
            await activatedCallback({ tabId: 1 });

            // Wait a bit to simulate time passing
            await new Promise(resolve => setTimeout(resolve, 100));

            // Simulate another tab change to trigger stats update
            await activatedCallback({ tabId: 2 });
        });
    });

    describe('Message Handling', () => {
        it('should handle GET_TODAY_STATS message', () => {
            // Get the message listener callback
            const messageCallback = chrome.runtime.onMessage.addListener.mock.calls[0][0];
            
            const mockSender = {};
            const mockResponse = jest.fn();

            messageCallback(
                { type: 'GET_TODAY_STATS' },
                mockSender,
                mockResponse
            );

            expect(mockResponse).toHaveBeenCalled();
        });

        it('should handle GENERATE_REPORT message', () => {
            // Get the message listener callback
            const messageCallback = chrome.runtime.onMessage.addListener.mock.calls[0][0];
            
            const mockSender = {};
            const mockResponse = jest.fn();

            messageCallback(
                { type: 'GENERATE_REPORT' },
                mockSender,
                mockResponse
            );
        });
    });

    describe('Alarms', () => {
        it('should set up daily reset alarm', () => {
            // Get the installation callback
            const installCallback = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
            installCallback();

            expect(chrome.alarms.create).toHaveBeenCalledWith('dailyReset', expect.any(Object));
        });

        it('should handle daily reset alarm', () => {
            // Get the alarm listener callback
            const alarmCallback = chrome.alarms.onAlarm.addListener.mock.calls[0][0];
            
            // Simulate daily reset alarm
            alarmCallback({ name: 'dailyReset' });

            // TODO: Add expectations for reset stats
        });
    });
}); 