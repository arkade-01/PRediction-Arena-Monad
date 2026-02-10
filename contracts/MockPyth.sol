// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// Minimal struct to match Pyth's
library PythStructs {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint64 publishTime;
    }
}

contract MockPyth {
    mapping(bytes32 => PythStructs.Price) public prices;
    uint256 public singleUpdateFeeInWei = 1;

    // 1. updatePriceFeeds
    function updatePriceFeeds(bytes[] calldata updateData) external payable {
        // Mock update: decode data and set price
        // Data format: abi.encode(id, price, expo, publishTime)
        for (uint i = 0; i < updateData.length; i++) {
             (bytes32 id, int64 price, int32 expo, uint64 publishTime) = abi.decode(updateData[i], (bytes32, int64, int32, uint64));
             prices[id] = PythStructs.Price(price, 0, expo, publishTime);
        }
    }

    // 2. getUpdateFee
    function getUpdateFee(bytes[] calldata updateData) external view returns (uint feeAmount) {
        return updateData.length * singleUpdateFeeInWei;
    }

    // 3. getPriceUnsafe
    function getPriceUnsafe(bytes32 id) external view returns (PythStructs.Price memory price) {
        return prices[id];
    }
}