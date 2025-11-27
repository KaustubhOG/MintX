"use client";

import { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function ClaimPage() {
  const [allocation, setAllocation] = useState(""); // will be fetched later
  const [claimable, setClaimable] = useState(""); // will be calculated later

  return (
    <div className="flex flex-col items-center">
      {/* Navbar */}
      <div className="flex items-center w-full px-4 pt-4">
        <div className="flex-1"></div>

        <div className="flex-1 text-center text-xl font-bold">MintX</div>

        <div className="flex-1 flex justify-end">
          <WalletMultiButton />
        </div>
      </div>

      <h1 className="text-3xl font-bold mt-8">Claim Your Tokens</h1>

      <div className="mt-10 w-full max-w-xl space-y-4">
        {/* Allocation Display */}
        <div className="border p-4 rounded text-center">
          <p className="text-xl font-semibold">Your Allocation</p>
          <p className="text-2xl mt-2">{allocation || "0"} Tokens</p>
        </div>

        {/* Claimable Token Display */}
        <div className="border p-4 rounded text-center">
          <p className="text-xl font-semibold">Claimable Now</p>
          <p className="text-2xl mt-2">{claimable || "0"} Tokens</p>
        </div>

        {/* Claim Button */}
        <button className="w-full p-3 bg-green-600 text-white rounded">
          Claim Tokens
        </button>
      </div>
    </div>
  );
}
