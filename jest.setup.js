// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Learn more: https://jestjs.io/docs/configuration#setupfilesafterenv-array

// Mock environment variables for testing
process.env.NODE_ENV = 'test'

// Mock NextResponse for testing
global.NextResponse = {
    json: jest.fn((data, init) => {
        const response = new Response(JSON.stringify(data), {
            status: init?.status || 200,
            headers: {
                'Content-Type': 'application/json',
                ...init?.headers
            }
        });
        return response;
    })
};

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    // Uncomment to ignore a specific log level
    // log: jest.fn(),
    // debug: jest.fn(),
    // info: jest.fn(),
    // warn: jest.fn(),
    // error: jest.fn(),
} 