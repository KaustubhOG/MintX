"use client";

import {
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { useState } from "react";

export default function Home() {
  const [tokenName, settokenName] = useState("");
  const [symbol, setsymbol] = useState("");
  const [decimal, setdecimal] = useState("");
  const [totalsupply, settotalsupply] = useState("");

  return (
    <div className=" flex flex-col justify-center items-center">
      <div className="flex items-center w-full px-4 pt-4">
        <div className="flex-1"></div>

        <div className="flex-1 text-center text-xl font-bold">MintX</div>

        <div className="flex-1 flex justify-end">
          <WalletMultiButton />
        </div>
      </div>

      <div className="flex flex-col justify-center items-center pb-8 pt-4 text-4xl text-green-300">
        <input
          className="border p-2 rounded mb-3"
          type="text"
          placeholder="TokenName"
          value={tokenName}
          onChange={(e) => settokenName(e.target.value)}
        />
        <input
          className="border p-2 rounded mb-3"
          type="text"
          placeholder="Symbol"
          value={symbol}
          onChange={(e) => setsymbol(e.target.value)}
        />
        <input
          className="border p-2 rounded mb-3"
          type="number"
          placeholder="decimal"
          value={decimal}
          onChange={(e) => setdecimal(e.target.value)}
        />
        <input
          className="border p-2 rounded mb-3"
          type="number"
          placeholder="total Supply"
          value={totalsupply}
          onChange={(e) => settotalsupply(e.target.value)}
        />
      </div>
      <div>
        <button className="px-4 py-2 bg-blue-500 text-white rounded">
          Mint it
        </button>
      </div>
    </div>
  );
}
