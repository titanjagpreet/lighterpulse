/**
 * Validation utilities for blockchain-related inputs
 */

export const VALIDATION_PATTERNS = {
  ETH_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  TXN_HASH: /^0x[a-fA-F0-9]{64}$/,
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
  
  if (validateEthereumAddress(trimmedValue)) return 'address';
  if (validateTransactionHash(trimmedValue)) return 'transaction';
  if (validateBlockNumber(trimmedValue)) return 'block';
  
  return 'invalid';
};

export const getRouteForInput = (value: string): string | null => {
  const inputType = getInputType(value);
  const trimmedValue = value.trim();
  
  switch (inputType) {
    case 'address':
      return `/dashboard/${trimmedValue}`;
    case 'transaction':
      return `/explorer/${trimmedValue}`;
    case 'block':
      return `/explorer/block/${trimmedValue}`;
    default:
      return null;
  }
};
