const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("PredictionArena", function () {
  async function deployFixture() {
    const [owner, agent1, agent2] = await ethers.getSigners();

    // Deploy MockPyth
    const MockPyth = await ethers.getContractFactory("MockPyth");
    const mockPyth = await MockPyth.deploy();

    // Deploy PredictionArena
    const PredictionArena = await ethers.getContractFactory("PredictionArena");
    const predictionArena = await PredictionArena.deploy(mockPyth.target);

    // Register agents
    await predictionArena.connect(agent1).registerAgent();
    await predictionArena.connect(agent2).registerAgent();

    return { predictionArena, mockPyth, owner, agent1, agent2 };
  }

  describe("Round Management", function () {
    it("Should create a round correctly", async function () {
      const { predictionArena, owner } = await loadFixture(deployFixture);

      const entryFee = ethers.parseEther("0.1");
      const duration = 3600; // 1 hour

      await expect(predictionArena.createRound("Will ETH hit 3k?", entryFee, duration))
        .to.emit(predictionArena, "RoundCreated")
        .withArgs(1, "Will ETH hit 3k?", entryFee, (await ethers.provider.getBlock("latest")).timestamp + duration + 1, false);
    });

    it("Should allow agents to submit predictions", async function () {
      const { predictionArena, agent1, agent2 } = await loadFixture(deployFixture);

      const entryFee = ethers.parseEther("0.1");
      await predictionArena.createRound("Question?", entryFee, 3600);

      await predictionArena.connect(agent1).submitPrediction(1, 100, { value: entryFee });
      await predictionArena.connect(agent2).submitPrediction(1, 200, { value: entryFee });

      const players = await predictionArena.getRoundPlayers(1);
      expect(players).to.have.lengthOf(2);
      expect(players).to.include(agent1.address);
      expect(players).to.include(agent2.address);
    });
  });

  describe("Resolution", function () {
    it("Should resolve manually and payout winner", async function () {
      const { predictionArena, owner, agent1, agent2 } = await loadFixture(deployFixture);
      const entryFee = ethers.parseEther("1.0");
      
      await predictionArena.createRound("Q?", entryFee, 100);
      
      // Predictions: Agent1 says 100, Agent2 says 200
      await predictionArena.connect(agent1).submitPrediction(1, 100, { value: entryFee });
      await predictionArena.connect(agent2).submitPrediction(1, 200, { value: entryFee });

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [150]);
      await ethers.provider.send("evm_mine", []);

      // Resolve with 120 (closer to 100) -> Agent1 wins
      await expect(predictionArena.resolveRound(1, 120))
        .to.changeEtherBalances(
            [agent1, agent2], 
            [ethers.parseEther("2.0"), 0]
        ); // Agent1 gets pot (2.0)
    });
  });
});
