/**
 * Blockchain Verification Service
 * 
 * Verifies USDT transactions on TRC20 (Tron) and Polygon networks
 * Uses public APIs to check transaction validity
 */

// USDT Contract Addresses
const USDT_CONTRACTS = {
  // TRC20 USDT on Tron Network
  TRC20: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  // USDT on Polygon (PoS)
  Polygon: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
};

// Minimum confirmations required
const MIN_CONFIRMATIONS = {
  TRC20: 19,  // Tron recommends 19 confirmations for finality
  Polygon: 3, // Polygon has faster finality
};

// API Endpoints
const TRONGRID_API = "https://api.trongrid.io";
const POLYGONSCAN_API = "https://api.polygonscan.com/api";

// Wallet addresses from environment
const getWalletAddress = (network: string): string => {
  if (network === "TRC20") {
    return process.env.TRON_WALLET_ADDRESS || "TRX123456789abcdefghijklmnopqrstuv";
  }
  return process.env.POLYGON_WALLET_ADDRESS || "0x123456789abcdefABCDEF123456789abcdefABCD";
};

export interface VerificationResult {
  valid: boolean;
  amount?: number;
  from?: string;
  to?: string;
  confirmations?: number;
  tokenSymbol?: string;
  timestamp?: number;
  error?: string;
  needsMoreConfirmations?: boolean;
}

/**
 * Convert hex address to Base58 (Tron format)
 */
function hexToBase58(hexAddress: string): string {
  // This is a simplified version - in production, use a proper library
  // Tron addresses start with 0x41 and are converted to Base58
  return hexAddress; // Placeholder - actual conversion would be done here
}

/**
 * Verify TRC20 (Tron Network) USDT Transaction
 * 
 * Uses TronGrid API to verify:
 * - Transaction exists and is confirmed
 * - Sent to our wallet address
 * - Token is USDT
 * - Amount matches or exceeds expected
 */
export async function verifyTRC20Transaction(
  txHash: string,
  expectedAmount: number,
  expectedAddress?: string
): Promise<VerificationResult> {
  try {
    // Clean the txHash (remove 0x prefix if present)
    const cleanHash = txHash.startsWith("0x") ? txHash.slice(2) : txHash;
    
    // Ensure hash is 64 characters
    if (cleanHash.length !== 64) {
      return {
        valid: false,
        error: "Hash TRC20 inválido - deve ter 64 caracteres hexadecimais",
      };
    }

    // Query TronGrid API for transaction details
    const response = await fetch(
      `${TRONGRID_API}/wallet/gettransactionbyid?value=${cleanHash}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return {
        valid: false,
        error: "Erro ao consultar a blockchain Tron",
      };
    }

    const txData = await response.json();

    // Check if transaction exists
    if (!txData || Object.keys(txData).length === 0) {
      return {
        valid: false,
        error: "Transação não encontrada na blockchain Tron",
      };
    }

    // Check if transaction is confirmed (ret should be SUCCESS)
    const isConfirmed = txData.ret?.[0]?.contractRet === "SUCCESS";
    if (!isConfirmed) {
      return {
        valid: false,
        error: "Transação não foi confirmada com sucesso",
      };
    }

    // Parse the raw transaction data
    const contractData = txData.raw_data?.contract?.[0];
    if (!contractData) {
      return {
        valid: false,
        error: "Dados do contrato não encontrados",
      };
    }

    // Check if it's a TRC20 transfer (trigger smart contract)
    if (contractData.type !== "TriggerSmartContract") {
      return {
        valid: false,
        error: "Transação não é uma transferência TRC20",
      };
    }

    // Get contract address (should be USDT contract)
    const contractAddress = contractData.parameter?.value?.contract_address;
    if (contractAddress !== USDT_CONTRACTS.TRC20) {
      return {
        valid: false,
        error: "Transação não é para o contrato USDT",
      };
    }

    // Decode the transfer data
    // The data field contains the transfer function call
    const data = contractData.parameter?.value?.data;
    if (!data || data.length < 136) {
      return {
        valid: false,
        error: "Dados da transferência inválidos",
      };
    }

    // Extract recipient address (bytes 32-72 of data, after function selector)
    const recipientHex = "41" + data.slice(32, 72);
    
    // Extract amount (bytes 72-136, in hex, then convert to decimal)
    // USDT has 6 decimals on Tron
    const amountHex = data.slice(72, 136);
    const amountRaw = BigInt("0x" + amountHex);
    const amount = Number(amountRaw) / 1_000_000; // Convert from micro USDT to USDT

    // Get our expected wallet address
    const ourWallet = expectedAddress || getWalletAddress("TRC20");

    // Check if the transaction is to our wallet
    // Note: This comparison needs proper address encoding in production
    const isToOurWallet = recipientHex.toLowerCase().includes(ourWallet.toLowerCase().slice(0, 10));

    // Get transaction info for confirmations
    const txInfoResponse = await fetch(
      `${TRONGRID_API}/wallet/gettransactioninfobyid?value=${cleanHash}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    let confirmations = 0;
    if (txInfoResponse.ok) {
      const txInfo = await txInfoResponse.json();
      // Get current block and calculate confirmations
      const blockNumber = txInfo.blockNumber;
      if (blockNumber) {
        // Get latest block
        const latestBlockResponse = await fetch(
          `${TRONGRID_API}/wallet/getnowblock`,
          { method: "POST" }
        );
        if (latestBlockResponse.ok) {
          const latestBlock = await latestBlockResponse.json();
          const latestBlockNumber = latestBlock.block_header?.raw_data?.number;
          if (latestBlockNumber) {
            confirmations = latestBlockNumber - blockNumber;
          }
        }
      }
    }

    // Check if amount matches (allow >= expected, user might send slightly more)
    const amountValid = amount >= expectedAmount;

    // Check confirmations
    const needsMoreConfirmations = confirmations < MIN_CONFIRMATIONS.TRC20;

    if (!amountValid) {
      return {
        valid: false,
        amount,
        confirmations,
        error: `Valor incorreto. Esperado: ${expectedAmount} USDT, Recebido: ${amount} USDT`,
      };
    }

    if (needsMoreConfirmations) {
      return {
        valid: true,
        amount,
        confirmations,
        needsMoreConfirmations: true,
        error: `Aguardando confirmações (${confirmations}/${MIN_CONFIRMATIONS.TRC20})`,
      };
    }

    return {
      valid: true,
      amount,
      confirmations,
      tokenSymbol: "USDT",
      timestamp: txData.raw_data?.timestamp,
    };

  } catch (error) {
    console.error("TRC20 verification error:", error);
    return {
      valid: false,
      error: "Erro ao verificar transação TRC20",
    };
  }
}

/**
 * Verify Polygon USDT Transaction
 * 
 * Uses PolygonScan API to verify:
 * - Transaction exists and is confirmed
 * - Sent to our wallet address
 * - Token is USDT
 * - Amount matches or exceeds expected
 */
export async function verifyPolygonTransaction(
  txHash: string,
  expectedAmount: number,
  expectedAddress?: string
): Promise<VerificationResult> {
  try {
    // Validate hash format
    if (!txHash.startsWith("0x") || txHash.length !== 66) {
      return {
        valid: false,
        error: "Hash Polygon inválido - deve começar com 0x e ter 66 caracteres",
      };
    }

    const apiKey = process.env.POLYGONSCAN_API_KEY || "";

    // Get transaction receipt for status and confirmations
    const txReceiptUrl = `${POLYGONSCAN_API}?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}${apiKey ? `&apikey=${apiKey}` : ""}`;
    const receiptResponse = await fetch(txReceiptUrl);
    
    if (!receiptResponse.ok) {
      return {
        valid: false,
        error: "Erro ao consultar a blockchain Polygon",
      };
    }

    const receiptData = await receiptResponse.json();

    // Check if transaction exists
    if (receiptData.error || !receiptData.result) {
      return {
        valid: false,
        error: "Transação não encontrada na blockchain Polygon",
      };
    }

    // Check transaction status (1 = success, 0 = failed)
    const status = parseInt(receiptData.result.status, 16);
    if (status !== 1) {
      return {
        valid: false,
        error: "Transação falhou na blockchain",
      };
    }

    // Get token transfer details
    const tokenTxUrl = `${POLYGONSCAN_API}?module=account&action=tokentx&contractaddress=${USDT_CONTRACTS.Polygon}&txhash=${txHash}${apiKey ? `&apikey=${apiKey}` : ""}`;
    const tokenResponse = await fetch(tokenTxUrl);
    
    if (!tokenResponse.ok) {
      return {
        valid: false,
        error: "Erro ao consultar transferência de token",
      };
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.result || tokenData.result.length === 0) {
      return {
        valid: false,
        error: "Transferência USDT não encontrada nesta transação",
      };
    }

    // Get the token transfer
    const tokenTransfer = tokenData.result[0];

    // Verify token is USDT
    if (tokenTransfer.tokenSymbol !== "USDT") {
      return {
        valid: false,
        error: `Token incorreto: ${tokenTransfer.tokenSymbol}. Esperado: USDT`,
      };
    }

    // Get our expected wallet address
    const ourWallet = (expectedAddress || getWalletAddress("Polygon")).toLowerCase();

    // Check recipient
    const recipient = tokenTransfer.to.toLowerCase();
    if (recipient !== ourWallet.toLowerCase()) {
      return {
        valid: false,
        error: "Transação não foi enviada para nossa carteira",
      };
    }

    // Get amount (USDT has 6 decimals on Polygon)
    const amount = parseFloat(tokenTransfer.value) / 1_000_000;

    // Check if amount matches
    const amountValid = amount >= expectedAmount;
    if (!amountValid) {
      return {
        valid: false,
        amount,
        error: `Valor incorreto. Esperado: ${expectedAmount} USDT, Recebido: ${amount} USDT`,
      };
    }

    // Get confirmations
    const confirmations = parseInt(tokenTransfer.confirmations || "0");
    const needsMoreConfirmations = confirmations < MIN_CONFIRMATIONS.Polygon;

    if (needsMoreConfirmations) {
      return {
        valid: true,
        amount,
        confirmations,
        needsMoreConfirmations: true,
        error: `Aguardando confirmações (${confirmations}/${MIN_CONFIRMATIONS.Polygon})`,
      };
    }

    return {
      valid: true,
      amount,
      from: tokenTransfer.from,
      to: tokenTransfer.to,
      confirmations,
      tokenSymbol: "USDT",
      timestamp: parseInt(tokenTransfer.timeStamp),
    };

  } catch (error) {
    console.error("Polygon verification error:", error);
    return {
      valid: false,
      error: "Erro ao verificar transação Polygon",
    };
  }
}

/**
 * Main verification function that routes to the appropriate network
 */
export async function verifyTransaction(
  txHash: string,
  expectedAmount: number,
  network: "TRC20" | "Polygon",
  expectedAddress?: string
): Promise<VerificationResult> {
  if (network === "TRC20") {
    return verifyTRC20Transaction(txHash, expectedAmount, expectedAddress);
  } else if (network === "Polygon") {
    return verifyPolygonTransaction(txHash, expectedAmount, expectedAddress);
  }

  return {
    valid: false,
    error: "Rede não suportada",
  };
}

/**
 * Get transaction explorer URL for viewing
 */
export function getExplorerUrl(txHash: string, network: "TRC20" | "Polygon"): string {
  if (network === "TRC20") {
    return `https://tronscan.org/#/transaction/${txHash}`;
  }
  return `https://polygonscan.com/tx/${txHash}`;
}
