import { createTestWallet } from "@/lib/test-wallet";

// Demo helper, not part of the Lendara integration: gives the buyer a
// testnet account with a USDC trustline.
export async function POST() {
  try {
    return Response.json({ account: await createTestWallet() });
  } catch (err) {
    console.error("create test wallet:", err);
    return Response.json({ error: "Could not create a test wallet. Try again in a few seconds." }, { status: 502 });
  }
}
