//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

contract PredictionArena is ReentrancyGuard {
    // ============ Structures ============
    struct Round {
        uint256 id;
        string question;
        bytes32 pythPriceId;      // Pyth price feed ID (if price-based)
        uint256 entryFee;
        uint256 startTime;
        uint256 endTime;
        int64 outcome;            // resolved value (changed to int64 for Pyth prices)
        bool resolved;
        bool cancelled;
        bool usePyth;             // true = resolve via Pyth oracle
        address[] players;
    }

    struct Prediction {
        address player;
        int64 value;              // predicted value (int64 for price predictions)
        uint256 timestamp;
    }

    struct AgentStats {
        uint256 wins;
        uint256 losses;
        uint256 totalWagered;
        uint256 totalWon;
        uint256 roundsPlayed;
        uint256 bestStreak;
        uint256 currentStreak;
        bool isRegistered;
    }

    // ============ State ============
    IPyth public pyth;
    
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => Prediction)) public predictions;
    mapping(uint256 => mapping(address => bool)) public refunded;
    mapping(address => AgentStats) public agentStats;
    
    address[] public registeredAgents;
    uint256 public roundCount;
    address public owner;

    // ============ Events ============
    event RoundCreated(uint256 indexed id, string question, uint256 entryFee, uint256 endTime, bool usePyth);
    event PredictionSubmitted(uint256 indexed roundId, address indexed player, int64 value);
    event RoundResolved(uint256 indexed roundId, int64 outcome, address[] winners);
    event RoundCancelled(uint256 indexed roundId, string reason);
    event Payout(uint256 indexed roundId, address indexed player, uint256 amount);
    event RefundClaimed(uint256 indexed roundId, address indexed player, uint256 amount);
    event TreasuryWithdrawn(uint256 amount);
    event AgentRegistered(address indexed agent);
    event AgentStatsUpdated(address indexed agent, uint256 wins, uint256 losses);

    // ============ Modifiers ============
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier onlyRegisteredAgent() {
        require(agentStats[msg.sender].isRegistered, "Agent not registered");
        _;
    }

    // ============ Constructor ============
    constructor(address _pythAddress) {
        owner = msg.sender;
        pyth = IPyth(_pythAddress);
    }

    // ============ Agent Registration ============
    function registerAgent() external {
        require(!agentStats[msg.sender].isRegistered, "Already registered");
        
        agentStats[msg.sender] = AgentStats({
            wins: 0,
            losses: 0,
            totalWagered: 0,
            totalWon: 0,
            roundsPlayed: 0,
            bestStreak: 0,
            currentStreak: 0,
            isRegistered: true
        });
        
        registeredAgents.push(msg.sender);
        emit AgentRegistered(msg.sender);
    }

    function getRegisteredAgents() external view returns (address[] memory) {
        return registeredAgents;
    }

    function getAgentStats(address _agent) external view returns (AgentStats memory) {
        return agentStats[_agent];
    }

    // ============ Round Management ============
    function createRound(
        string memory _question,
        uint256 _entryFee,
        uint256 _duration
    ) external onlyOwner {
        _createRound(_question, bytes32(0), _entryFee, _duration, false);
    }

    function createPythRound(
        string memory _question,
        bytes32 _pythPriceId,
        uint256 _entryFee,
        uint256 _duration
    ) external onlyOwner {
        _createRound(_question, _pythPriceId, _entryFee, _duration, true);
    }

    function _createRound(
        string memory _question,
        bytes32 _pythPriceId,
        uint256 _entryFee,
        uint256 _duration,
        bool _usePyth
    ) internal {
        roundCount++;
        Round storage newRound = rounds[roundCount];
        newRound.id = roundCount;
        newRound.question = _question;
        newRound.pythPriceId = _pythPriceId;
        newRound.entryFee = _entryFee;
        newRound.startTime = block.timestamp;
        newRound.endTime = block.timestamp + _duration;
        newRound.usePyth = _usePyth;
        
        emit RoundCreated(roundCount, _question, _entryFee, newRound.endTime, _usePyth);
    }

    // ============ Predictions ============
    function submitPrediction(uint256 _roundId, int64 _value) external payable nonReentrant onlyRegisteredAgent {
        require(_roundId > 0 && _roundId <= roundCount, "Invalid round ID");
        Round storage round = rounds[_roundId];
        
        require(!round.cancelled, "Round cancelled");
        require(!round.resolved, "Round resolved");
        require(block.timestamp < round.endTime, "Round ended");
        require(msg.value == round.entryFee, "Incorrect entry fee");
        require(predictions[_roundId][msg.sender].timestamp == 0, "Already predicted");

        predictions[_roundId][msg.sender] = Prediction({
            player: msg.sender,
            value: _value,
            timestamp: block.timestamp
        });

        round.players.push(msg.sender);
        
        // Update agent stats
        agentStats[msg.sender].totalWagered += msg.value;
        agentStats[msg.sender].roundsPlayed++;
        
        emit PredictionSubmitted(_roundId, msg.sender, _value);
    }

    // ============ Resolution ============
    function resolveRound(uint256 _roundId, int64 _outcome) external onlyOwner nonReentrant {
        require(_roundId > 0 && _roundId <= roundCount, "Invalid round ID");
        Round storage round = rounds[_roundId];
        require(!round.usePyth, "Use resolveWithPyth for oracle rounds");
        
        _resolveRound(_roundId, _outcome);
    }

    function resolveWithPyth(uint256 _roundId, bytes[] calldata priceUpdateData) external payable onlyOwner nonReentrant {
        require(_roundId > 0 && _roundId <= roundCount, "Invalid round ID");
        Round storage round = rounds[_roundId];
        require(round.usePyth, "Not a Pyth round");
        
        // Update Pyth price
        uint256 fee = pyth.getUpdateFee(priceUpdateData);
        pyth.updatePriceFeeds{value: fee}(priceUpdateData);
        
        // Get price (use getPriceUnsafe since we just updated)
        PythStructs.Price memory price = pyth.getPriceUnsafe(round.pythPriceId);
        
        _resolveRound(_roundId, price.price);
    }

    function _resolveRound(uint256 _roundId, int64 _outcome) internal {
        Round storage round = rounds[_roundId];
        
        require(!round.resolved, "Already resolved");
        require(!round.cancelled, "Already cancelled");
        require(block.timestamp > round.endTime, "Round not ended");

        // Validate minimum players
        if (round.players.length < 2) {
            _cancelRound(_roundId, "Insufficient players");
            return;
        }

        round.outcome = _outcome;
        round.resolved = true;

        uint256 minDelta = type(uint256).max;
        
        // First pass: find minimum delta
        for (uint256 i = 0; i < round.players.length; i++) {
            address playerAddr = round.players[i];
            int64 predictionVal = predictions[_roundId][playerAddr].value;
            uint256 delta = _absDiff(predictionVal, _outcome);
            
            if (delta < minDelta) {
                minDelta = delta;
            }
        }

        // Second pass: identify winners
        address[] memory winners = new address[](round.players.length);
        uint256 winnerCount = 0;
        
        for (uint256 i = 0; i < round.players.length; i++) {
            address playerAddr = round.players[i];
            int64 predictionVal = predictions[_roundId][playerAddr].value;
            uint256 delta = _absDiff(predictionVal, _outcome);

            if (delta == minDelta) {
                winners[winnerCount] = playerAddr;
                winnerCount++;
            }
        }

        // Update stats for all players
        for (uint256 i = 0; i < round.players.length; i++) {
            address playerAddr = round.players[i];
            bool isWinner = false;
            
            for (uint256 j = 0; j < winnerCount; j++) {
                if (winners[j] == playerAddr) {
                    isWinner = true;
                    break;
                }
            }
            
            if (isWinner) {
                agentStats[playerAddr].wins++;
                agentStats[playerAddr].currentStreak++;
                if (agentStats[playerAddr].currentStreak > agentStats[playerAddr].bestStreak) {
                    agentStats[playerAddr].bestStreak = agentStats[playerAddr].currentStreak;
                }
            } else {
                agentStats[playerAddr].losses++;
                agentStats[playerAddr].currentStreak = 0;
            }
            
            emit AgentStatsUpdated(playerAddr, agentStats[playerAddr].wins, agentStats[playerAddr].losses);
        }

        // Payout
        uint256 roundPot = round.players.length * round.entryFee;
        uint256 rewardPerWinner = roundPot / winnerCount;

        address[] memory finalWinners = new address[](winnerCount);
        for(uint i = 0; i < winnerCount; i++) {
            finalWinners[i] = winners[i];
            agentStats[winners[i]].totalWon += rewardPerWinner;
            
            (bool success, ) = payable(winners[i]).call{value: rewardPerWinner}("");
            require(success, "Payout failed");
            
            emit Payout(_roundId, winners[i], rewardPerWinner);
        }

        emit RoundResolved(_roundId, _outcome, finalWinners);
    }

    function _absDiff(int64 a, int64 b) internal pure returns (uint256) {
        if (a > b) {
            return uint256(uint64(a - b));
        } else {
            return uint256(uint64(b - a));
        }
    }

    // ============ Cancellation & Refunds ============
    function cancelRound(uint256 _roundId) external onlyOwner {
        _cancelRound(_roundId, "Admin cancelled");
    }

    function _cancelRound(uint256 _roundId, string memory reason) internal {
        Round storage round = rounds[_roundId];
        require(!round.resolved, "Cannot cancel resolved");
        require(!round.cancelled, "Already cancelled");
        
        round.cancelled = true;
        emit RoundCancelled(_roundId, reason);
    }

    function claimRefund(uint256 _roundId) external nonReentrant {
        Round storage round = rounds[_roundId];
        require(round.cancelled, "Round not cancelled");
        require(predictions[_roundId][msg.sender].timestamp != 0, "Not a participant");
        require(!refunded[_roundId][msg.sender], "Already refunded");

        refunded[_roundId][msg.sender] = true;
        uint256 refundAmount = round.entryFee;

        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Refund failed");

        emit RefundClaimed(_roundId, msg.sender, refundAmount);
    }

    // ============ Views ============
    function getRoundPlayers(uint256 _roundId) external view returns (address[] memory) {
        return rounds[_roundId].players;
    }

    function getLeaderboard() external view returns (address[] memory, uint256[] memory) {
        uint256 len = registeredAgents.length;
        address[] memory agents = new address[](len);
        uint256[] memory scores = new uint256[](len);
        
        for (uint256 i = 0; i < len; i++) {
            agents[i] = registeredAgents[i];
            scores[i] = agentStats[registeredAgents[i]].wins;
        }
        
        // Simple bubble sort (fine for small lists)
        for (uint256 i = 0; i < len; i++) {
            for (uint256 j = i + 1; j < len; j++) {
                if (scores[j] > scores[i]) {
                    (scores[i], scores[j]) = (scores[j], scores[i]);
                    (agents[i], agents[j]) = (agents[j], agents[i]);
                }
            }
        }
        
        return (agents, scores);
    }

    // ============ Admin ============
    function withdrawTreasury(uint256 _amount) external onlyOwner {
        require(_amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = payable(owner).call{value: _amount}("");
        require(success, "Withdraw failed");
        
        emit TreasuryWithdrawn(_amount);
    }

    function updatePythAddress(address _newPyth) external onlyOwner {
        pyth = IPyth(_newPyth);
    }

    receive() external payable {}
}
