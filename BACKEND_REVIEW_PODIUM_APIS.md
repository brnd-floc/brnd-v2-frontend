# Backend Review: Podium Collectibles APIs

## Overall Assessment: ✅ **Mostly Good, but needs a few fixes**

The backend implementation looks solid overall! The structure, error handling, and validation are well done. However, there are a few critical issues that need to be addressed:

---

## ✅ What's Working Well

1. **Endpoint Structure**: All three endpoints match frontend expectations
2. **Authentication**: Proper use of `AuthorizationGuard` and session handling
3. **Validation**: Deadline validation, token existence checks, ownership verification
4. **Error Handling**: Good use of NestJS exceptions with proper error codes
5. **Contract Integration**: Proper use of viem for contract reads
6. **Eligibility Logic**: The claim eligibility check logic looks correct

---

## ⚠️ Critical Issues to Fix

### 1. **`getPodiumData()` Return Type Mismatch** ❌

**Problem**: The contract's `podiumData` mapping doesn't include `brandIds`. You're trying to access `brand1`, `brand2`, `brand3` from `podiumData`, but they don't exist there.

**Current Code**:
```typescript
async getPodiumData(tokenId: number): Promise<{
  brand1: number;
  brand2: number;
  brand3: number;
  ownerFid: bigint;
  claimCount: bigint;
}> {
  const data = await this.publicClient.readContract({
    address: this.PODIUM_CONTRACT_ADDRESS,
    abi: PODIUM_CONTRACT_ABI,
    functionName: 'podiumData',  // ❌ This doesn't return brandIds
    args: [BigInt(tokenId)],
  });
  // ...
}
```

**Solution**: Use `getPodium()` function instead, which returns all data including brandIds:

```typescript
async getPodiumData(tokenId: number): Promise<{
  brandIds: [number, number, number];
  genesisCreatorFid: bigint;
  ownerFid: bigint;
  claimCount: bigint;
  currentPrice: bigint;
  totalFeesEarned: bigint;
  createdAt: bigint;
}> {
  const data = await this.publicClient.readContract({
    address: this.PODIUM_CONTRACT_ADDRESS,
    abi: PODIUM_CONTRACT_ABI,
    functionName: 'getPodium',  // ✅ Use this instead
    args: [BigInt(tokenId)],
  });

  const [
    brandIds,
    genesisCreatorFid,
    ownerFid,
    claimCount,
    currentPrice,
    totalFeesEarned,
    createdAt,
  ] = data as any;

  return {
    brandIds: [
      Number(brandIds[0]),
      Number(brandIds[1]),
      Number(brandIds[2]),
    ] as [number, number, number],
    genesisCreatorFid: genesisCreatorFid as bigint,
    ownerFid: ownerFid as bigint,
    claimCount: claimCount as bigint,
    currentPrice: currentPrice as bigint,
    totalFeesEarned: totalFeesEarned as bigint,
    createdAt: createdAt as bigint,
  };
}
```

**Then update `calculateAccumulatedFees()` to use `brandIds`**:
```typescript
async calculateAccumulatedFees(
  tokenId: number,
  feeClaimNonce: bigint,
): Promise<bigint> {
  const podiumData = await this.getPodiumData(tokenId);
  const brandIds = podiumData.brandIds; // ✅ Now available
  // ... rest of the function
}
```

---

### 2. **Fee Calculation Missing Already-Claimed Fees** ❌

**Problem**: The `calculateAccumulatedFees()` function has a TODO comment and doesn't subtract fees that have already been claimed.

**Current Code**:
```typescript
// TODO: Subtract fees already claimed
// This would require tracking FeesClaimed events or using feeClaimNonce
// For now, we return the total accumulated fees
// The contract will handle preventing double claims via nonce
```

**Solution**: You need to track `FeesClaimed` events and subtract them. The contract's `podiumData[tokenId].totalFeesEarned` field tracks lifetime fees, but you need to calculate what's available to claim.

**Option 1: Track Events** (Recommended)
```typescript
async calculateAccumulatedFees(
  tokenId: number,
  feeClaimNonce: bigint,
): Promise<bigint> {
  const podiumData = await this.getPodiumData(tokenId);
  const brandIds = podiumData.brandIds;

  // Get all votes for this arrangement
  const votes = await this.userBrandVotesRepository
    .createQueryBuilder('vote')
    // ... existing query ...

  // Calculate total fees from all votes
  let totalFees = BigInt(0);
  for (const vote of votes) {
    if (vote.brndPaidWhenCreatingPodium) {
      const voteCost = BigInt(vote.brndPaidWhenCreatingPodium);
      const fee = (voteCost * BigInt(this.REPEAT_FEE_BPS)) / BigInt(10000);
      totalFees += fee;
    }
  }

  // ✅ Subtract fees already claimed
  // The contract's totalFeesEarned tracks what's been claimed
  const feesAlreadyClaimed = podiumData.totalFeesEarned;
  const availableFees = totalFees - feesAlreadyClaimed;

  // Ensure non-negative
  return availableFees > BigInt(0) ? availableFees : BigInt(0);
}
```

**Option 2: Use Contract's totalFeesEarned**
The contract already tracks `totalFeesEarned` in `podiumData`. You could calculate:
- Total fees from all votes = `totalFees`
- Fees already claimed = `podiumData.totalFeesEarned`
- Available to claim = `totalFees - totalFeesEarned`

---

### 3. **Signature Service Methods Not Shown** ⚠️

**Issue**: I don't see the `signatureService` methods (`generateClaimPodiumSignature`, `generateBuyPodiumSignature`, `generateClaimFeesSignature`). These are critical and must:

1. **Fetch nonces from contract** before signing
2. **Use correct EIP-712 domain separator**:
   ```typescript
   const domain = {
     name: "BRNDPodiumCollectables",
     version: "1",
     chainId: 8453,
     verifyingContract: "0xe14A1b3f3314De3EBadBc30bFB3a91D4aC49Bd06"
   };
   ```

3. **Use correct type hashes**:
   - Claim: `ClaimPodium(uint16 brand1,uint16 brand2,uint16 brand3,uint256 fid,uint256 price,uint256 nonce,uint256 deadline)`
   - Buy: `BuyPodium(uint256 tokenId,uint256 buyerFid,uint256 price,uint256 nonce,uint256 deadline)`
   - Fees: `ClaimFees(uint256 tokenId,uint256 feeAmount,uint256 nonce,uint256 deadline)`

4. **Include all parameters** in the correct order

**Example for Claim Signature**:
```typescript
async generateClaimPodiumSignature(
  fid: number,
  walletAddress: string,
  brandIds: [number, number, number],
  deadline: number,
): Promise<string> {
  // ✅ Fetch nonce from contract
  const nonce = await this.podiumService.getFidNonce(fid);
  
  const BASE_PRICE = BigInt('1000000000000000000000000');
  
  const message = {
    brand1: brandIds[0],
    brand2: brandIds[1],
    brand3: brandIds[2],
    fid: BigInt(fid),
    price: BASE_PRICE,
    nonce: nonce,
    deadline: BigInt(deadline),
  };

  // Use your EIP-712 signing library here
  // Make sure to use the correct domain and type hash
  return await this.signEIP712(domain, 'ClaimPodium', message);
}
```

**Please verify** that your signature service:
- ✅ Fetches nonces before signing
- ✅ Uses the correct EIP-712 domain
- ✅ Uses the correct type hashes
- ✅ Includes all required parameters

---

### 4. **Price Calculation in Buy Endpoint** ✅ (Looks Good)

The buy endpoint correctly:
- Gets podium data
- Calculates price: `BASE_PRICE + claimCount * PRICE_INCREMENT`
- Returns price as string

**Just make sure** the signature includes this calculated price, not a hardcoded value.

---

## 📝 Minor Improvements

### 1. **Error Response Format**

Your error responses are good, but consider standardizing:

```typescript
// Current
throw new ForbiddenException({
  error: 'NOT_ELIGIBLE',
  message: 'User not eligible to claim this podium',
});

// Consider also including the reason from eligibility check
throw new ForbiddenException({
  error: 'NOT_ELIGIBLE',
  message: eligibility.reason || 'User not eligible to claim this podium',
  reason: eligibility.reason, // ✅ Already doing this, good!
});
```

### 2. **Logging**

Your logging is good! Consider adding more context:
```typescript
logger.log(
  `🏆 [PODIUM] Claim signature request for FID: ${session.sub}, Brands: [${body.brandIds.join(', ')}], Wallet: ${body.walletAddress}`,
);
```

### 3. **Type Safety**

Consider using stricter types:
```typescript
// Instead of
brandIds: [number, number, number]

// Consider
brandIds: readonly [number, number, number]
```

---

## ✅ Checklist for Backend Team

Before deploying, verify:

- [ ] `getPodiumData()` uses `getPodium()` function, not `podiumData` mapping
- [ ] `calculateAccumulatedFees()` subtracts already-claimed fees
- [ ] Signature service fetches nonces from contract before signing
- [ ] Signature service uses correct EIP-712 domain separator
- [ ] Signature service uses correct type hashes for each operation
- [ ] All signature parameters are included in correct order
- [ ] Buy signature includes the calculated price (not hardcoded)
- [ ] Error responses include `reason` field when available
- [ ] Test all three endpoints with valid and invalid inputs
- [ ] Test signature verification on contract

---

## 🎯 Summary

**What's Good**: Structure, validation, error handling, contract integration

**What Needs Fixing**:
1. ❌ `getPodiumData()` - use `getPodium()` instead of `podiumData` mapping
2. ❌ `calculateAccumulatedFees()` - subtract already-claimed fees
3. ⚠️ Verify signature service includes nonces and uses correct EIP-712 format

Once these are fixed, the backend should work perfectly with the frontend! 🚀

