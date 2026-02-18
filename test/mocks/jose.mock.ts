const mockKey = {
  algorithm: 'RSA-OAEP-256',
  // Add any other necessary key properties
};

export const importPKCS8 = jest.fn().mockResolvedValue(mockKey);
export const importSPKI = jest.fn().mockResolvedValue(mockKey);
export const CompactEncrypt = jest.fn().mockReturnThis();
export const setProtectedHeader = jest.fn().mockReturnThis();
export const encrypt = jest.fn().mockResolvedValue('mockToken');
export const CompactDecrypt = jest.fn().mockReturnThis();
export const decrypt = jest.fn().mockResolvedValue({
  plaintext: Buffer.from('mockPayload'),
  protectedHeader: { alg: 'RSA-OAEP-256', enc: 'A256GCM' },
});
export const EncryptJWT = jest.fn().mockImplementation(() => ({
  setProtectedHeader: jest.fn().mockReturnThis(),
  setIssuedAt: jest.fn().mockReturnThis(),
  setIssuer: jest.fn().mockReturnThis(),
  setAudience: jest.fn().mockReturnThis(),
  setExpirationTime: jest.fn().mockReturnThis(),
  encrypt: jest.fn().mockResolvedValue('mockToken'),
}));
