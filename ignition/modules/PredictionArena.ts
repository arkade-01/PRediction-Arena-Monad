import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PYTH_ADDRESS = "0x2880aB155794e7179c9eE2e38200202908C17B43";

const PredictionArenaModule = buildModule("PredictionArenaModule", (m) => {
  const arena = m.contract("PredictionArena", [PYTH_ADDRESS]);

  return { arena };
});

export default PredictionArenaModule;
