import { Balance, VanillaRuntimeModules } from "@proto-kit/library";
import { ModulesConfig } from "@proto-kit/common";

import { Balances } from "./modules/balances";
import { Minting } from "./modules/minting";

export const modules = VanillaRuntimeModules.with({
  Balances,
  Minting
});

export const config: ModulesConfig<typeof modules> = {
  Balances: {
    totalSupply: Balance.from(10_000),
  },
  Minting: {}
};

export default {
  modules,
  config,
};
