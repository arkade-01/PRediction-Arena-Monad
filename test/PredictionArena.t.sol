// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {PredictionArena} from "../contracts/PredictionArena.sol";

contract MockPyth {
    function getUpdateFee(bytes[] calldata) external pure returns (uint256) {
        return 0;
    }
    
    function updatePriceFeeds(bytes[] calldata) external payable {}
    
    function getPriceUnsafe(bytes32) external view returns (
        int64 price,
        uint64 conf,
        int32 expo,
        uint256 publishTime
    ) {
        return (5000 * 1e8, 0, -8, block.timestamp);
    }
}

contract PredictionArenaTest is Test {
    PredictionArena public arena;
    MockPyth public mockPyth;
    address public owner;
    address public player1;
    address public player2;
    address public player3;

    function setUp() public {
        owner = address(this);
        player1 = address(0x1);
        player2 = address(0x2);
        player3 = address(0x3);
        
        // Give players some ETH
        vm.deal(player1, 100 ether);
        vm.deal(player2, 100 ether);
        vm.deal(player3, 100 ether);

        // Deploy mock Pyth and arena
        mockPyth = new MockPyth();
        arena = new PredictionArena(address(mockPyth));
        
        // Register agents
        vm.prank(player1);
        arena.registerAgent();
        vm.prank(player2);
        arena.registerAgent();
        vm.prank(player3);
        arena.registerAgent();
    }

    function test_CreateRound() public {
        string memory question = "ETH price > 3000?";
        uint256 entryFee = 0.1 ether;
        uint256 duration = 1 hours;

        arena.createRound(question, entryFee, duration);

        (
            uint256 id,
            string memory rQuestion,
            ,  // pythPriceId
            uint256 rEntryFee,
            uint256 startTime,
            uint256 endTime,
            ,  // outcome
            bool resolved,
            ,  // cancelled
            bool usePyth
        ) = arena.rounds(1);

        assertEq(id, 1);
        assertEq(rQuestion, question);
        assertEq(rEntryFee, entryFee);
        assertEq(endTime, startTime + duration);
        assertEq(resolved, false);
        assertEq(usePyth, false);
    }

    function test_SubmitPrediction() public {
        uint256 entryFee = 1 ether;
        arena.createRound("Test?", entryFee, 1 hours);

        vm.prank(player1);
        arena.submitPrediction{value: entryFee}(1, 100);

        (address pPlayer, int64 pValue, uint256 pTimestamp) = arena.predictions(1, player1);
        
        assertEq(pPlayer, player1);
        assertEq(pValue, 100);
        assertTrue(pTimestamp > 0);
    }

    function test_ResolveRoundAndPayout() public {
        uint256 entryFee = 1 ether;
        arena.createRound("Number?", entryFee, 1 hours);

        // Player 1 predicts 50 (Diff 0) - WINNER
        vm.prank(player1);
        arena.submitPrediction{value: entryFee}(1, 50);

        // Player 2 predicts 40 (Diff 10)
        vm.prank(player2);
        arena.submitPrediction{value: entryFee}(1, 40);

        // Player 3 predicts 60 (Diff 10)
        vm.prank(player3);
        arena.submitPrediction{value: entryFee}(1, 60);

        // WARP to end time
        vm.warp(block.timestamp + 1 hours + 1);

        uint256 initialBalanceP1 = player1.balance;

        // Resolve with outcome 50
        arena.resolveRound(1, 50);

        // Pot = 3 ETH. Winner = Player 1.
        assertEq(player1.balance, initialBalanceP1 + 3 ether);
        
        (,,,,, , int64 outcome, bool resolved,,) = arena.rounds(1);
        assertEq(outcome, 50);
        assertTrue(resolved);
        
        // Check agent stats
        PredictionArena.AgentStats memory stats = arena.getAgentStats(player1);
        assertEq(stats.wins, 1);
    }

    function test_ResolveRoundTie() public {
        uint256 entryFee = 1 ether;
        arena.createRound("Number?", entryFee, 1 hours);

        // P1 -> 40 (Diff 10)
        vm.prank(player1);
        arena.submitPrediction{value: entryFee}(1, 40);

        // P2 -> 60 (Diff 10)
        vm.prank(player2);
        arena.submitPrediction{value: entryFee}(1, 60);

        vm.warp(block.timestamp + 2 hours);
        
        uint256 startBal1 = player1.balance;
        uint256 startBal2 = player2.balance;

        // Outcome 50. Both are 10 away.
        arena.resolveRound(1, 50);

        // Pot 2 ETH. Split 1 ETH each.
        assertEq(player1.balance, startBal1 + 1 ether);
        assertEq(player2.balance, startBal2 + 1 ether);
    }

    function test_AutoCancelInsufficientPlayers() public {
        uint256 entryFee = 1 ether;
        arena.createRound("Test?", entryFee, 1 hours);

        // Only 1 player joins
        vm.prank(player1);
        arena.submitPrediction{value: entryFee}(1, 50);

        vm.warp(block.timestamp + 2 hours);

        // Should automatically switch to cancelled
        arena.resolveRound(1, 50);
        
        (,,,,,,,, bool cancelled,) = arena.rounds(1);
        assertTrue(cancelled);

        // Player claims refund
        uint256 startBal = player1.balance;
        
        vm.prank(player1);
        arena.claimRefund(1);

        assertEq(player1.balance, startBal + 1 ether);
    }
    
    function test_AgentRegistration() public {
        address newAgent = address(0x99);
        
        vm.prank(newAgent);
        arena.registerAgent();
        
        PredictionArena.AgentStats memory stats = arena.getAgentStats(newAgent);
        assertTrue(stats.isRegistered);
        assertEq(stats.wins, 0);
        assertEq(stats.losses, 0);
    }
    
    function test_Leaderboard() public {
        uint256 entryFee = 1 ether;
        
        // Round 1: Player 1 wins
        arena.createRound("R1", entryFee, 1 hours);
        vm.prank(player1);
        arena.submitPrediction{value: entryFee}(1, 100);
        vm.prank(player2);
        arena.submitPrediction{value: entryFee}(1, 50);
        vm.warp(block.timestamp + 2 hours);
        arena.resolveRound(1, 100);
        
        // Check leaderboard
        (address[] memory agents, uint256[] memory scores) = arena.getLeaderboard();
        assertEq(agents[0], player1);
        assertEq(scores[0], 1);
    }
}
