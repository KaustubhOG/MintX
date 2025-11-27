"use client";

import { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function VestingPage() {
  const [mintAddress, setMintAddress] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [cliff, setCliff] = useState("");
  const [duration, setDuration] = useState("");
  const [frequency, setFrequency] = useState("monthly");

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

      <h1 className="text-3xl font-bold mt-8">Create Vesting Schedule</h1>

      <div className="mt-8 w-full max-w-xl space-y-4">
        <input
          type="text"
          placeholder="Token Mint Address"
          value={mintAddress}
          onChange={(e) => setMintAddress(e.target.value)}
          className="w-full border p-2 rounded"
        />

        {/* CSV Upload */}
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
          className="w-full border p-2 rounded"
        />

        <input
          type="number"
          placeholder="Cliff (in months)"
          value={cliff}
          onChange={(e) => setCliff(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <input
          type="number"
          placeholder="Vesting Duration (in months)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <select
          className="w-full border p-2 rounded"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
        >
          <option value="monthly">Monthly</option>
          <option value="daily">Daily</option>
          <option value="linear">Linear</option>
        </select>

        <button className="w-full p-3 bg-blue-600 text-white rounded">
          Create Vesting
        </button>
      </div>
    </div>
  );
}
