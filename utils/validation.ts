export const VALIDATION_PATTERNS = {
  // Ethereum address pattern (0x followed by 40 hex characters) - case insensitive
  ETH_ADDRESS: /^0x[a-fA-F0-9]{40}$/i,
  // Transaction hash patterns - various lengths and formats
  // Standard 64-char hex: 51c76f39f739bd4239c1db44ffa77168fa0c11bdc334c6b4ee30d72593bc1a9589620a1530d35677
  // Long hex: 5033133a5ee303604b751c07530f5d7e83c00e82c013e79d7ba09a23de34c5e477ecb236b3f843d7
  // Zero-padded: 00000001f8178924000001993ceacc46000000000000000000000000000000000000000000000000
  TXN_HASH: /^[0-9a-fA-F]{32,128}$/i,
  // Block number pattern (numeric only)
  BLOCK_NUMBER: /^[0-9]+$/,
} as const;

export const validateEthereumAddress = (address: string): boolean => {
  return VALIDATION_PATTERNS.ETH_ADDRESS.test(address.trim());
};

export const validateTransactionHash = (hash: string): boolean => {
  return VALIDATION_PATTERNS.TXN_HASH.test(hash.trim());
};

export const validateBlockNumber = (blockNumber: string): boolean => {
  return VALIDATION_PATTERNS.BLOCK_NUMBER.test(blockNumber.trim());
};

export const getInputType = (value: string): 'address' | 'transaction' | 'block' | 'invalid' => {
  const trimmedValue = value.trim();
  
  // Check for Ethereum address first (most specific pattern)
  if (validateEthereumAddress(trimmedValue)) return 'address';
  
  // Check for block number (numeric only)
  if (validateBlockNumber(trimmedValue)) return 'block';
  
  // Check for transaction hash (hex string of various lengths)
  if (validateTransactionHash(trimmedValue)) return 'transaction';
  
  return 'invalid';
};

export const getRouteForInput = (value: string): string | null => {
  const inputType = getInputType(value);
  const trimmedValue = value.trim();
  
  switch (inputType) {
    case 'address':
      return `/dashboard/${trimmedValue}`;
    case 'transaction':
      return `/explorer/tx/${trimmedValue}`;
    case 'block':
      return `/explorer/block/${trimmedValue}`;
    default:
      return null;
  }
};
