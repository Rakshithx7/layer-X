export type CreateTokenCommand = {
  tokenName: string;
  tokenSymbol: string;
  initialSupply: string;
  tokenLogoURL?: string;
};

const CREATE_VERBS = new Set(["create", "launch", "mint"]);
const TOKEN_NOUNS = new Set(["token", "coin"]);

export function parseCreateTokenCommand(input: string): CreateTokenCommand | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Supports: create token PrajwalCoin PRJ 1000000
  // Supports: create token PrajwalCoin PRJ 1000000 https://example.com/logo.png
  // Supports: create token PrajwalCoin PRJ 1000000 logo=https://example.com/logo.png
  // Supports: create token "Prajwal Coin" PRJ 1000000
  const quoted = trimmed.match(
    /^(\w+)\s+(\w+)\s+"([^"]{1,32})"\s+([a-zA-Z][a-zA-Z0-9]{1,9})\s+([\d,]+)(?:\s+(?:logo=)?(https?:\/\/\S+))?$/i,
  );
  const unquoted = trimmed.match(
    /^(\w+)\s+(\w+)\s+([a-zA-Z][a-zA-Z0-9_-]{1,31})\s+([a-zA-Z][a-zA-Z0-9]{1,9})\s+([\d,]+)(?:\s+(?:logo=)?(https?:\/\/\S+))?$/i,
  );

  const match = quoted ?? unquoted;
  if (!match) {
    return null;
  }

  const action = match[1].toLowerCase();
  const noun = match[2].toLowerCase();
  if (!CREATE_VERBS.has(action) || !TOKEN_NOUNS.has(noun)) {
    return null;
  }

  const tokenName = match[3].trim();
  const tokenSymbol = match[4].toUpperCase().trim();
  const initialSupply = match[5].replace(/,/g, "").trim();
  const tokenLogoURL = match[6]?.trim();

  if (!tokenName || !tokenSymbol || !/^\d+$/.test(initialSupply)) {
    return null;
  }

  if (tokenLogoURL) {
    try {
      const url = new URL(tokenLogoURL);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return null;
      }
    } catch {
      return null;
    }
  }

  return {
    tokenName,
    tokenSymbol,
    initialSupply,
    tokenLogoURL,
  };
}
