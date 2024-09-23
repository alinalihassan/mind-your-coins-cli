import chalk from "chalk";
import LunchMoneyClient from "lunch-money-client";
import type {
  Asset,
  AssetTypeName,
  Currency,
  PlaidAccount,
  PlaidAccountType,
} from "lunch-money-client";

// Define a unified account type
type UnifiedAsset = {
  id: number;
  type: AssetTypeName;
  name: string;
  display_name?: string;
  balance: string;
  currency: Currency;
  institution_name?: string;
};

// Function to convert Asset to UnifiedAccount
function assetToUnified(asset: Asset): UnifiedAsset {
  return {
    id: asset.id,
    type: asset.type_name,
    name: asset.name,
    display_name: asset.display_name,
    balance: asset.balance,
    currency: asset.currency,
    institution_name: asset.institution_name,
  };
}

// Function to map Plaid account types to our unified types
function mapPlaidType(type: PlaidAccountType): AssetTypeName {
  switch (type) {
    case "depository":
      return "cash";
    case "credit":
    case "loan":
    case "investment":
      return type;
    case "brokerage":
      return "investment";
    default:
      return "other asset";
  }
}

// Function to convert PlaidAccount to UnifiedAccount
function plaidToUnified(plaid: PlaidAccount): UnifiedAsset {
  return {
    id: plaid.id,
    type: mapPlaidType(plaid.type),
    name: plaid.name,
    display_name: plaid.display_name,
    balance: plaid.balance,
    currency: plaid.currency,
    institution_name: plaid.institution_name,
  };
}

const sortAssets = (a: UnifiedAsset, b: UnifiedAsset): number => {
  // Define the order of asset types
  const assetTypeOrder: AssetTypeName[] = [
    "cash",
    "credit",
    "investment",
    "real estate",
    "loan",
    "vehicle",
    "cryptocurrency",
    "employee compensation",
    "other asset",
    "other liability",
  ];

  // Create a mapping of asset types to their index in the order array
  const assetTypeOrderMap = new Map(
    assetTypeOrder.map((type, index) => [type, index])
  );
  const orderA = assetTypeOrderMap.get(a.type) ?? assetTypeOrder.length;
  const orderB = assetTypeOrderMap.get(b.type) ?? assetTypeOrder.length;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  // If asset types are the same, sort by name
  return a.name.localeCompare(b.name);
};

const printGroupedAssets = (assets: UnifiedAsset[]) => {
  let currentType: AssetTypeName | null = null;
  const typeColors: Record<AssetTypeName, (text: string) => string> = {
    cash: chalk.green,
    credit: chalk.red,
    investment: chalk.blue,
    "real estate": chalk.magenta,
    loan: chalk.red,
    vehicle: chalk.magenta,
    cryptocurrency: chalk.yellow,
    "employee compensation": chalk.blue,
    "other asset": chalk.blue,
    "other liability": chalk.red,
    // ... add other types with their corresponding colors
  };

  assets.forEach((asset, index) => {
    if (asset.type !== currentType) {
      if (index > 0) console.log();
      console.log(
        typeColors[asset.type](`--- ${asset.type.toUpperCase()} ---`)
      );
      currentType = asset.type;
    }
    console.log(
      `  ${chalk.black(asset.name)}: ${parseFloat(asset.balance).toFixed(
        0
      )} ${chalk.blackBright(asset.currency.toUpperCase())}`
    );
  });
};

// Main function to get, sort, and print accounts
async function processAccounts(client: LunchMoneyClient): Promise<void> {
  const assets = await client.getAssets();
  const plaidAccounts = await client.getPlaidAccounts();

  const unifiedAccounts: UnifiedAsset[] = [
    ...assets.map(assetToUnified),
    ...plaidAccounts.map(plaidToUnified),
  ];

  const sortedAccounts = unifiedAccounts.sort(sortAssets);
  printGroupedAssets(sortedAccounts);
}

const client = new LunchMoneyClient(process.env.LUNCH_MONEY_TOKEN);
processAccounts(client);
