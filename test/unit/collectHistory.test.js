// 히스토리 수집기 클래스 임포트
const HistoryCollector = require('../../background/collectHistory');

// 스토리지 모의 데이터 초기화
let mockStorage = {};

// Chrome API 모의 객체 설정
// 히스토리, 탭, 스토리지 관련 API를 Jest mock 함수로 구현
global.chrome = {
    history: {
        search: jest.fn(),
        getVisits: jest.fn(),
        deleteUrl: jest.fn(),
        onVisited: {
            addListener: jest.fn()
        }
    },
    tabs: {
        query: jest.fn()
    },
    storage: {
        sync: {
            get: jest.fn(keys => Promise.resolve(mockStorage)),
            set: jest.fn(data => {
                mockStorage = { ...mockStorage, ...data };
                return Promise.resolve();
            })
        }
    }
};

describe('History Collection', () => {
    let collector;

    // 각 테스트 전에 실행되는 설정
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        mockStorage = {};
        collector = new HistoryCollector();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    // 방문 기록 추적 테스트
    describe('Visit Tracking', () => {
        // 새로운 방문 기록 추적 테스트
        it('should track new visits', async () => {
            const mockVisit = {
                id: '1',
                url: 'https://github.com',
                title: 'GitHub',
                visitTime: new Date().getTime()
            };

            chrome.tabs.query.mockResolvedValueOnce([{
                id: 1,
                url: mockVisit.url,
                active: true
            }]);

            mockStorage.categories = {
                'Productivity': ['github.com']
            };

            chrome.history.getVisits.mockResolvedValueOnce([
                { visitTime: Date.now() - 1000 },
                { visitTime: Date.now() }
            ]);

            await collector.handleVisit(mockVisit);

            expect(chrome.storage.sync.get).toHaveBeenCalled();
            expect(chrome.history.getVisits).toHaveBeenCalledWith({ url: mockVisit.url });
        });

        // 유효하지 않은 URL 처리 테스트
        it('should handle invalid URLs', async () => {
            const mockVisit = {
                id: '2',
                url: 'chrome://extensions',
                title: 'Extensions',
                visitTime: new Date().getTime()
            };

            await collector.handleVisit(mockVisit);

            expect(chrome.storage.sync.set).not.toHaveBeenCalled();
        });
    });

    // 히스토리 검색 테스트
    describe('History Search', () => {
        // 현재 날짜의 히스토리 조회 테스트
        it('should retrieve history for the current day', async () => {
            const mockHistory = [
                {
                    id: '1',
                    url: 'https://github.com',
                    title: 'GitHub',
                    lastVisitTime: new Date().getTime()
                },
                {
                    id: '2',
                    url: 'https://google.com',
                    title: 'Google',
                    lastVisitTime: new Date().getTime() - 3600000
                }
            ];

            chrome.history.search.mockResolvedValueOnce(mockHistory);

            const result = await chrome.history.search({
                text: '',
                startTime: new Date().setHours(0, 0, 0, 0),
                maxResults: 10000
            });

            expect(result).toHaveLength(2);
            expect(result[0].url).toBe('https://github.com');
        });

        // 빈 히스토리 결과 처리 테스트
        it('should handle empty history results', async () => {
            chrome.history.search.mockResolvedValueOnce([]);

            const result = await chrome.history.search({
                text: '',
                startTime: new Date().setHours(0, 0, 0, 0),
                maxResults: 10000
            });

            expect(result).toHaveLength(0);
        });
    });

    // 방문 상세 정보 테스트
    describe('Visit Details', () => {
        // 사이트 체류 시간 계산 테스트
        it('should calculate time spent on a site', async () => {
            const mockVisits = [
                {
                    visitId: '1',
                    visitTime: new Date().getTime() - 3600000, // 1 hour ago
                    transition: 'link'
                },
                {
                    visitId: '2',
                    visitTime: new Date().getTime(), // now
                    transition: 'link'
                }
            ];

            const timeSpent = collector.calculateTimeSpent(mockVisits);
            expect(timeSpent).toBe(3600000); // 1 hour in milliseconds
        });

        // 단일 방문 처리 테스트
        it('should handle single visit', async () => {
            const mockVisits = [
                {
                    visitId: '1',
                    visitTime: new Date().getTime(),
                    transition: 'link'
                }
            ];

            const timeSpent = collector.calculateTimeSpent(mockVisits);
            expect(timeSpent).toBe(0);
        });
    });

    // 카테고리 분류 테스트
    describe('Category Classification', () => {
        // URL 카테고리 분류 정확성 테스트
        it('should classify URLs into correct categories', async () => {
            const mockCategories = {
                'Productivity': ['github.com', 'gitlab.com'],
                'Social Media': ['twitter.com', 'facebook.com']
            };

            const url = 'https://github.com/test/repo';
            const category = collector.categorizeUrl(url, mockCategories);

            expect(category).toBe('Productivity');
        });

        // 미분류 URL 처리 테스트
        it('should handle uncategorized URLs', async () => {
            const mockCategories = {
                'Productivity': ['github.com'],
                'Social Media': ['twitter.com']
            };

            const url = 'https://unknown-site.com';
            const category = collector.categorizeUrl(url, mockCategories);

            expect(category).toBe('Uncategorized');
        });
    });

    // 데이터 정리 테스트
    describe('Data Cleanup', () => {
        // 오래된 히스토리 항목 정리 테스트
        it('should clean up old history entries', async () => {
            const mockOldItems = [
                { url: 'https://old-site1.com' },
                { url: 'https://old-site2.com' }
            ];

            chrome.history.search.mockResolvedValueOnce(mockOldItems);
            chrome.history.deleteUrl.mockResolvedValue(undefined);

            await collector.cleanupOldHistory(30);

            expect(chrome.history.deleteUrl).toHaveBeenCalledTimes(2);
            expect(chrome.history.deleteUrl).toHaveBeenCalledWith({ url: mockOldItems[0].url });
            expect(chrome.history.deleteUrl).toHaveBeenCalledWith({ url: mockOldItems[1].url });
        });

        // 삭제 오류 처리 테스트
        it('should handle deletion errors', async () => {
            const mockOldItems = [
                { url: 'https://error-site.com' }
            ];

            chrome.history.search.mockResolvedValueOnce(mockOldItems);
            chrome.history.deleteUrl.mockRejectedValueOnce(new Error('Deletion failed'));

            await collector.cleanupOldHistory(30);

            expect(chrome.history.deleteUrl).toHaveBeenCalledWith({ url: mockOldItems[0].url });
        });
    });
});
