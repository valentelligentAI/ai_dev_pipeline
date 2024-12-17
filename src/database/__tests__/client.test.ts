import { DatabaseClient } from '../client';
import { Pool } from 'pg';
import { testConfig } from './test-utils';
import * as config from '../config';

// Create mock Pool class
class MockPool extends Pool {
    public override query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    public override connect = jest.fn();
    public override end = jest.fn().mockResolvedValue(undefined);
}

jest.mock('fs/promises', () => ({
    readFile: jest.fn().mockResolvedValue('CREATE TABLE IF NOT EXISTS test();')
}));

describe('DatabaseClient', () => {
    let client: DatabaseClient;
    let mockPool: MockPool;

    beforeEach(async () => {
        mockPool = new MockPool();
        jest.spyOn(config, 'getPool').mockReturnValue(mockPool);
        jest.spyOn(config, 'closePool').mockImplementation(async () => {
            await mockPool.end();
        });
        
        client = DatabaseClient.getInstance(testConfig);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize schema successfully', async () => {
        await client.initializeSchema();
        expect(mockPool.query).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
        mockPool.query.mockRejectedValueOnce(new Error('Connection failed'));
        await expect(client.initializeSchema()).rejects.toThrow('Connection failed');
    });

    it('should close connection', async () => {
        await client.close();
        expect(mockPool.end).toHaveBeenCalled();
    });
});
