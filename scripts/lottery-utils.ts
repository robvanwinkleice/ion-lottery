import { Address, beginCell, Cell, internal, SendMode, toNano } from "@ton/core";
import type { OpenedContract } from "@ton/core";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { TonClient, WalletContractV4 } from "@ton/ton";

export const endpoint = process.env.ION_ENDPOINT ?? "https://api.mainnet.ice.io/http/v2/jsonRPC";

export function textBody(message: string): Cell {
  return beginCell().storeUint(0, 32).storeStringTail(message).endCell();
}

export function requireContractAddress(value = process.env.CONTRACT_ADDRESS ?? process.argv[2]): Address {
  if (!value) {
    throw new Error("Missing CONTRACT_ADDRESS. Set it in .env or pass it as an argument.");
  }
  return Address.parse(value);
}

export function lotteryOwnerAddress(fallback: Address): Address {
  const configuredOwner = process.env.LOTTERY_OWNER_ADDRESS?.trim();
  if (!configuredOwner) {
    return fallback;
  }
  return Address.parse(configuredOwner);
}

export function formatIon(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const whole = absolute / 1_000_000_000n;
  const fraction = (absolute % 1_000_000_000n).toString().padStart(9, "0").replace(/0+$/, "");
  return `${sign}${whole}${fraction ? `.${fraction}` : ""} ION`;
}

export function parseIonAmount(value: string | undefined, label: string): bigint {
  if (!value) {
    throw new Error(`Missing ${label}.`);
  }
  return toNano(value);
}

export type WalletContext = {
  client: TonClient;
  wallet: WalletContractV4;
  openedWallet: OpenedContract<WalletContractV4>;
  secretKey: Buffer;
};

export async function loadWallet(
  mnemonic = process.env.ION_MNEMONIC?.trim(),
  label = "ION_MNEMONIC"
): Promise<WalletContext> {
  if (!mnemonic) {
    throw new Error(`Missing ${label}. Copy .env.example to .env and set a funded wallet mnemonic.`);
  }

  const words = mnemonic.split(/\s+/);
  if (words.length !== 24) {
    throw new Error(`${label} must contain 24 words; got ${words.length}.`);
  }

  const keyPair = await mnemonicToPrivateKey(words);
  const client = new TonClient({ endpoint });
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  const openedWallet = client.open(wallet);

  return { client, wallet, openedWallet, secretKey: keyPair.secretKey };
}

export type InternalSendMessage = {
  to: Address;
  value: bigint;
  body: Cell;
  init?: { code: Cell; data: Cell };
  bounce?: boolean;
};

export async function sendInternal(params: {
  walletContext: WalletContext;
} & InternalSendMessage): Promise<number> {
  return sendInternalBatch({
    walletContext: params.walletContext,
    messages: [params]
  });
}

export async function sendInternalBatch(params: {
  walletContext: WalletContext;
  messages: InternalSendMessage[];
}): Promise<number> {
  if (params.messages.length === 0) {
    throw new Error("Cannot send an empty message batch.");
  }

  const seqno = await params.walletContext.openedWallet.getSeqno();

  await params.walletContext.openedWallet.sendTransfer({
    secretKey: params.walletContext.secretKey,
    seqno,
    sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
    messages: params.messages.map((message) =>
      internal({
        to: message.to,
        value: message.value,
        bounce: message.bounce ?? true,
        init: message.init,
        body: message.body
      })
    )
  });

  return seqno;
}
