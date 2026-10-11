import { Account, Asset, BASE_FEE, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-base";
import { config } from "./config";

const FRIENDBOT_URL = "https://friendbot.stellar.org";

/**
 * Creates a throwaway testnet account that can receive Lendara's test USDC:
 * funds it with Friendbot and adds the USDC trustline. The secret key is
 * discarded; the account only exists to show the deposit arriving.
 */
export async function createTestWallet(): Promise<string> {
  const keypair = Keypair.random();
  const funded = await fetch(`${FRIENDBOT_URL}?addr=${keypair.publicKey()}`);
  if (!funded.ok) throw new Error(`friendbot: HTTP ${funded.status}`);

  const res = await fetch(`${config.horizonUrl}/accounts/${keypair.publicKey()}`);
  if (!res.ok) throw new Error(`horizon account: HTTP ${res.status}`);
  const { sequence } = (await res.json()) as { sequence: string };

  const tx = new TransactionBuilder(new Account(keypair.publicKey(), sequence), {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset: new Asset("USDC", config.usdcIssuer) }))
    .setTimeout(60)
    .build();
  tx.sign(keypair);

  const submit = await fetch(`${config.horizonUrl}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ tx: tx.toXDR() }),
  });
  if (!submit.ok) throw new Error(`horizon submit: HTTP ${submit.status} ${await submit.text()}`);
  return keypair.publicKey();
}
