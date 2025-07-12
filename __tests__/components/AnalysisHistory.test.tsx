// Simple unit test for AnalysisHistory component logic
// This tests the core functionality without complex React rendering

// Mock data structures for testing
interface MockAnalysisEvent {
    id: string;
    created_at: string;
    analysis_type?: string;
    image_urls?: string[];
    image_count?: number;
    r2_video_link?: string;
    original_filename?: string;
    status: string;
    analysis_report?: {
        text?: string;
        analysis_text?: string;
        timestamp: string;
        model_used: string;
        analysis_type?: string;
        image_count?: number;
    };
}

// Helper functions to test the logic that would be in AnalysisHistory component
function getReportText(analysisReport: { text?: string; analysis_text?: string } | null | undefined) {
    return analysisReport?.text || analysisReport?.analysis_text || null;
}

function getVideoFileName(url: string) {
    try {
        const urlParts = url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        return fileName || '未知文件';
    } catch {
        return '未知文件';
    }
}

function isImageAnalysis(event: MockAnalysisEvent) {
    return event.analysis_type === 'image';
}

function hasMultipleImages(event: MockAnalysisEvent) {
    return event.image_count && event.image_count > 1;
}

describe('AnalysisHistory Component Logic', () => {
    it('should correctly identify image analysis records', () => {
        const imageEvent: MockAnalysisEvent = {
            id: '1',
            created_at: '2024-01-01T00:00:00Z',
            analysis_type: 'image',
            image_urls: ['https://example.com/image1.jpg'],
            image_count: 1,
            original_filename: 'test-image.jpg',
            status: 'completed',
        };

        expect(isImageAnalysis(imageEvent)).toBe(true);
    });

    it('should correctly identify video analysis records', () => {
        const videoEvent: MockAnalysisEvent = {
            id: '2',
            created_at: '2024-01-01T00:00:00Z',
            analysis_type: 'video',
            r2_video_link: 'https://example.com/video.mp4',
            original_filename: 'test-video.mp4',
            status: 'completed',
        };

        expect(isImageAnalysis(videoEvent)).toBe(false);
    });

    it('should correctly detect multiple images', () => {
        const multiImageEvent: MockAnalysisEvent = {
            id: '3',
            created_at: '2024-01-01T00:00:00Z',
            analysis_type: 'image',
            image_urls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
            image_count: 2,
            original_filename: 'image1.jpg, image2.jpg',
            status: 'completed',
        };

        expect(hasMultipleImages(multiImageEvent)).toBe(true);
    });

    it('should correctly extract video filename from URL', () => {
        const videoUrl = 'https://example.com/path/to/video.mp4';
        expect(getVideoFileName(videoUrl)).toBe('video.mp4');
    });

    it('should handle malformed video URLs gracefully', () => {
        expect(getVideoFileName('')).toBe('未知文件');
        expect(getVideoFileName('invalid-url')).toBe('invalid-url');
    });

    it('should extract report text from new format (text field)', () => {
        const newFormatReport = {
            text: 'New format analysis result',
            timestamp: '2024-01-01T00:00:00Z',
            model_used: 'gemini-2.0-flash',
        };

        expect(getReportText(newFormatReport)).toBe('New format analysis result');
    });

    it('should extract report text from old format (analysis_text field)', () => {
        const oldFormatReport = {
            analysis_text: 'Old format analysis result',
            timestamp: '2024-01-01T00:00:00Z',
            model_used: 'gemini-2.0-flash',
        };

        expect(getReportText(oldFormatReport)).toBe('Old format analysis result');
    });

    it('should prioritize text field over analysis_text field', () => {
        const mixedFormatReport = {
            text: 'New format text',
            analysis_text: 'Old format text',
            timestamp: '2024-01-01T00:00:00Z',
            model_used: 'gemini-2.0-flash',
        };

        expect(getReportText(mixedFormatReport)).toBe('New format text');
    });

    it('should return null for empty or undefined analysis report', () => {
        expect(getReportText(null)).toBe(null);
        expect(getReportText(undefined)).toBe(null);
        expect(getReportText({})).toBe(null);
    });

    it('should handle single image correctly', () => {
        const singleImageEvent: MockAnalysisEvent = {
            id: '4',
            created_at: '2024-01-01T00:00:00Z',
            analysis_type: 'image',
            image_urls: ['https://example.com/single-image.jpg'],
            image_count: 1,
            original_filename: 'single-image.jpg',
            status: 'completed',
        };

        expect(hasMultipleImages(singleImageEvent)).toBe(false);
    });
});
