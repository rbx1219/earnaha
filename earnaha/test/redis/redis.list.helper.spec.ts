import { RedisListHelper } from '../../src/redis/redis.list.helper';
import { Redis } from 'ioredis';

describe('Redis Helpers', () => {
  describe('RedisListHelper', () => {
    let redisListHelper: RedisListHelper;
    let mockRedisClient: jest.Mocked<Redis>;

    beforeEach(() => {
      mockRedisClient = {
        rpush: jest.fn(),
        lindex: jest.fn(),
        lpop: jest.fn(),
        llen: jest.fn(),
      } as any;

      redisListHelper = new RedisListHelper(mockRedisClient);
    });

    describe('pushToUserList', () => {
      it('should push data to the user list if it is not full and return true', async () => {
        mockRedisClient.lindex
          .mockResolvedValueOnce((Date.now() - 11 * 60 * 1000).toString())
          .mockResolvedValue((Date.now() - 5 * 60 * 1000).toString());

        mockRedisClient.llen.mockResolvedValue(9);

        const token = 'testToken';
        const result = await redisListHelper.pushToUserList(token);

        expect(result).toBeTruthy();
        expect(mockRedisClient.rpush).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
        );
      });

      it('should not push data if the list is full and return false', async () => {
        mockRedisClient.lindex.mockResolvedValue(
          (Date.now() - 9 * 60 * 1000).toString(),
        ); // Mocking a non-expired timestamp
        mockRedisClient.llen.mockResolvedValue(10); // Mocking a list length of 10

        const token = 'testToken';
        const result = await redisListHelper.pushToUserList(token);

        expect(result).toBeFalsy();
        expect(mockRedisClient.rpush).not.toHaveBeenCalled();
      });
    });

    describe('activeLength', () => {
      it('should return the active length of the list', async () => {
        mockRedisClient.lindex
          .mockResolvedValueOnce(
            (Math.floor(Date.now() / 1000) - 11 * 60).toString(),
          ) // Mocking an expired timestamp for the first call
          .mockResolvedValueOnce(
            (Math.floor(Date.now() / 1000) - 5 * 60).toString(),
          ); // Mocking a non-expired timestamp for the second call
        mockRedisClient.llen.mockResolvedValue(9); // Mocking a list length of 9

        const token = 'testToken';
        const length = await redisListHelper.activeLength(token);

        expect(length).toBe(9);
      });
    });
    describe('trimList', () => {
      const token = 'testToken';

      it('should not remove any item if no items are expired', async () => {
        mockRedisClient.lindex.mockResolvedValue(
          (Math.floor(Date.now() / 1000) - 5 * 60).toString(),
        ); // Mocking a non-expired timestamp
        mockRedisClient.llen.mockResolvedValue(5); // Mocking a list length of 5

        const length = await redisListHelper['trimList'](
          token,
          Math.floor(Date.now() / 1000),
        );

        expect(length).toBe(5);
        expect(mockRedisClient.lpop).not.toHaveBeenCalled();
      });

      it('should remove one item if the first item is expired', async () => {
        mockRedisClient.lindex
          .mockResolvedValueOnce((Date.now() - 11 * 60 * 1000).toString()) // Mocking an expired timestamp for the first call
          .mockResolvedValueOnce((Date.now() - 5 * 60 * 1000).toString()); // Mocking a non-expired timestamp for the second call
        mockRedisClient.llen.mockResolvedValue(5); // Mocking a list length of 5

        const length = await redisListHelper['trimList'](
          token,
          Math.floor(Date.now()),
        );

        expect(length).toBe(5);
        expect(mockRedisClient.lpop).toHaveBeenCalledTimes(1);
      });

      it('should remove multiple items if the first few items are expired', async () => {
        mockRedisClient.lindex
          .mockResolvedValueOnce((Date.now() - 12 * 60 * 1000).toString()) // Mocking an expired timestamp for the first call
          .mockResolvedValueOnce((Date.now() - 11 * 60 * 1000).toString()) // Mocking an expired timestamp for the second call
          .mockResolvedValueOnce((Date.now() - 5 * 60 * 1000).toString()); // Mocking a non-expired timestamp for the third call
        mockRedisClient.llen.mockResolvedValue(5); // Mocking a list length of 5

        const length = await redisListHelper['trimList'](
          token,
          Math.floor(Date.now()),
        );

        expect(length).toBe(5);
        expect(mockRedisClient.lpop).toHaveBeenCalledTimes(2);
      });
    });
  });
});
