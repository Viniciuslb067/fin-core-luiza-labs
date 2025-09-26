import { computeLedgerHash } from '../../../../src/domain/services/ChainHasher';

describe('ChainHasher', () => {
  describe('computeLedgerHash', () => {
    it('should generate consistent hash for same input', () => {
      const input = {
        accountNumber: '12345',
        type: 'TRANSFER_IN',
        amount: '100.00',
        fee: '0.00',
        occurredAtIso: '2024-01-01T10:00:00.000Z',
        prevHash: 'abc123',
        description: 'Test transfer',
      };

      const hash1 = computeLedgerHash(input);
      const hash2 = computeLedgerHash(input);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex length
    });

    it('should generate different hashes for different inputs', () => {
      const baseInput = {
        accountNumber: '12345',
        type: 'TRANSFER_IN',
        amount: '100.00',
        fee: '0.00',
        occurredAtIso: '2024-01-01T10:00:00.000Z',
        prevHash: 'abc123',
        description: 'Test transfer',
      };

      const hash1 = computeLedgerHash(baseInput);
      
      const modifiedInput = { ...baseInput, amount: '200.00' };
      const hash2 = computeLedgerHash(modifiedInput);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle null prevHash correctly', () => {
      const input = {
        accountNumber: '12345',
        type: 'TRANSFER_IN',
        amount: '100.00',
        fee: '0.00',
        occurredAtIso: '2024-01-01T10:00:00.000Z',
        prevHash: null,
        description: 'First transaction',
      };

      const hash = computeLedgerHash(input);
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });

    it('should handle null description correctly', () => {
      const input = {
        accountNumber: '12345',
        type: 'TRANSFER_IN',
        amount: '100.00',
        fee: '0.00',
        occurredAtIso: '2024-01-01T10:00:00.000Z',
        prevHash: 'abc123',
        description: null,
      };

      const hash = computeLedgerHash(input);
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });

    it('should handle undefined description correctly', () => {
      const input = {
        accountNumber: '12345',
        type: 'TRANSFER_IN',
        amount: '100.00',
        fee: '0.00',
        occurredAtIso: '2024-01-01T10:00:00.000Z',
        prevHash: 'abc123',
        description: undefined,
      };

      const hash = computeLedgerHash(input);
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });

    it('should be sensitive to all input fields', () => {
      const baseInput = {
        accountNumber: '12345',
        type: 'TRANSFER_IN',
        amount: '100.00',
        fee: '0.00',
        occurredAtIso: '2024-01-01T10:00:00.000Z',
        prevHash: 'abc123',
        description: 'Test transfer',
      };

      const baseHash = computeLedgerHash(baseInput);

      // Test each field change
      const fields = ['accountNumber', 'type', 'amount', 'fee', 'occurredAtIso', 'prevHash', 'description'];
      
      fields.forEach(field => {
        const modifiedInput = { ...baseInput, [field]: 'modified' };
        const modifiedHash = computeLedgerHash(modifiedInput);
        expect(modifiedHash).not.toBe(baseHash);
      });
    });

    it('should handle empty strings correctly', () => {
      const input = {
        accountNumber: '',
        type: '',
        amount: '',
        fee: '',
        occurredAtIso: '',
        prevHash: '',
        description: '',
      };

      const hash = computeLedgerHash(input);
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });

    it('should produce deterministic output for real-world scenarios', () => {
      // Test with realistic financial data
      const transferOut = {
        accountNumber: 'ACC001',
        type: 'TRANSFER_OUT',
        amount: '1500.50',
        fee: '8.50',
        occurredAtIso: '2024-01-15T14:30:25.123Z',
        prevHash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
        description: 'Payment to supplier',
      };

      const transferIn = {
        accountNumber: 'ACC002',
        type: 'TRANSFER_IN',
        amount: '1500.50',
        fee: '0.00',
        occurredAtIso: '2024-01-15T14:30:25.123Z',
        prevHash: 'f1e2d3c4b5a6789012345678901234567890abcdef1234567890abcdef123456',
        description: 'Payment to supplier',
      };

      const outHash = computeLedgerHash(transferOut);
      const inHash = computeLedgerHash(transferIn);

      expect(outHash).not.toBe(inHash);
      expect(outHash).toHaveLength(64);
      expect(inHash).toHaveLength(64);
    });
  });
});
