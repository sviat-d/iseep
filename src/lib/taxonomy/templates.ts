import type { CriteriaGroup } from "./data";

export type AttributeTemplate = {
  industryId: string;
  category: string;
  label: string;
  group: CriteriaGroup;
  suggestedValues: string[];
};

// ---------------------------------------------------------------------------
// Sector 1: Financial Services
// ---------------------------------------------------------------------------

const fintech: AttributeTemplate[] = [
  { industryId: "fintech", category: "license_type", label: "License Type", group: "compliance", suggestedValues: ["EMI License", "PI License", "Banking License", "Money Transmitter License", "Sandbox License"] },
  { industryId: "fintech", category: "products", label: "Products", group: "technographic", suggestedValues: ["Payments", "Lending", "Accounts", "Cards", "Open Banking", "Embedded Finance"] },
  { industryId: "fintech", category: "target_market", label: "Target Market", group: "firmographic", suggestedValues: ["LATAM", "EU", "SEA", "Africa", "MENA", "US", "UK", "Global"] },
  { industryId: "fintech", category: "compliance_framework", label: "Compliance Framework", group: "compliance", suggestedValues: ["PCI DSS", "GDPR", "AML/KYC", "PSD2", "SOC 2", "ISO 27001"] },
];

const neobanking: AttributeTemplate[] = [
  { industryId: "neobanking", category: "license_type", label: "License Type", group: "compliance", suggestedValues: ["Partner/BaaS", "Own EMI License", "Banking License", "E-Money License"] },
  { industryId: "neobanking", category: "products", label: "Products", group: "technographic", suggestedValues: ["Cards", "On/Off Ramp", "Local Rails", "IBAN", "Virtual Accounts", "Multi-Currency Wallets"] },
  { industryId: "neobanking", category: "target_market", label: "Target Market", group: "firmographic", suggestedValues: ["LATAM", "EU", "SEA", "Africa", "MENA", "US", "UK", "Global"] },
  { industryId: "neobanking", category: "compliance_framework", label: "Compliance Framework", group: "compliance", suggestedValues: ["PCI DSS", "GDPR", "AML/KYC", "PSD2", "Strong Customer Authentication"] },
];

const paymentProcessing: AttributeTemplate[] = [
  { industryId: "payment-processing", category: "license_type", label: "License Type", group: "compliance", suggestedValues: ["PI License", "EMI License", "Money Transmitter License", "Acquiring License", "Facilitator Model"] },
  { industryId: "payment-processing", category: "products", label: "Products", group: "technographic", suggestedValues: ["Card Acquiring", "Payment Gateway", "POS Terminals", "Online Checkout", "Recurring Billing", "Mass Payouts", "Virtual Accounts"] },
  { industryId: "payment-processing", category: "target_market", label: "Target Market", group: "firmographic", suggestedValues: ["LATAM", "EU", "SEA", "Africa", "MENA", "US", "UK", "Global"] },
  { industryId: "payment-processing", category: "compliance_framework", label: "Compliance Framework", group: "compliance", suggestedValues: ["PCI DSS Level 1", "PCI DSS Level 2", "GDPR", "AML/KYC", "PSD2", "3DS2"] },
];

const banking: AttributeTemplate[] = [
  { industryId: "banking", category: "license_type", label: "License Type", group: "compliance", suggestedValues: ["Full Banking License", "Restricted Banking License", "BaaS Provider", "Credit Institution License"] },
  { industryId: "banking", category: "products", label: "Products", group: "technographic", suggestedValues: ["Current Accounts", "Savings", "Loans", "Mortgages", "Trade Finance", "Treasury", "Cash Management"] },
  { industryId: "banking", category: "target_market", label: "Target Market", group: "firmographic", suggestedValues: ["LATAM", "EU", "SEA", "Africa", "MENA", "US", "UK", "Global"] },
  { industryId: "banking", category: "compliance_framework", label: "Compliance Framework", group: "compliance", suggestedValues: ["Basel III", "GDPR", "AML/KYC", "PSD2", "Dodd-Frank", "MiFID II"] },
];

const insurance: AttributeTemplate[] = [
  { industryId: "insurance", category: "license_type", label: "License Type", group: "compliance", suggestedValues: ["Full Carrier License", "MGA License", "Broker License", "Coverholder", "Sandbox License"] },
  { industryId: "insurance", category: "products", label: "Products", group: "technographic", suggestedValues: ["Life Insurance", "P&C Insurance", "Health Insurance", "Cyber Insurance", "Embedded Insurance", "Parametric Insurance"] },
  { industryId: "insurance", category: "target_market", label: "Target Market", group: "firmographic", suggestedValues: ["LATAM", "EU", "SEA", "Africa", "MENA", "US", "UK", "Global"] },
];

const lending: AttributeTemplate[] = [
  { industryId: "lending", category: "license_type", label: "License Type", group: "compliance", suggestedValues: ["Consumer Lending License", "Commercial Lending License", "P2P License", "Marketplace Lending License", "BNPL License"] },
  { industryId: "lending", category: "products", label: "Products", group: "technographic", suggestedValues: ["Consumer Loans", "Business Loans", "Invoice Factoring", "BNPL", "Revenue-Based Financing", "Microloans"] },
  { industryId: "lending", category: "target_market", label: "Target Market", group: "firmographic", suggestedValues: ["LATAM", "EU", "SEA", "Africa", "MENA", "US", "UK", "Global"] },
  { industryId: "lending", category: "compliance_framework", label: "Compliance Framework", group: "compliance", suggestedValues: ["GDPR", "AML/KYC", "Fair Lending Laws", "TILA", "CRA", "ECOA"] },
];

const cryptoBlockchain: AttributeTemplate[] = [
  { industryId: "crypto-blockchain", category: "license_type", label: "License Type", group: "compliance", suggestedValues: ["VASP Registration", "MiCA License", "BitLicense", "MSB Registration", "DPT License", "Sandbox License"] },
  { industryId: "crypto-blockchain", category: "products", label: "Products", group: "technographic", suggestedValues: ["Exchange", "Custody", "On/Off Ramp", "Staking", "DeFi Protocol", "NFT Marketplace", "Token Issuance"] },
  { industryId: "crypto-blockchain", category: "target_market", label: "Target Market", group: "firmographic", suggestedValues: ["LATAM", "EU", "SEA", "Africa", "MENA", "US", "UK", "Global"] },
  { industryId: "crypto-blockchain", category: "compliance_framework", label: "Compliance Framework", group: "compliance", suggestedValues: ["MiCA", "Travel Rule", "AML/KYC", "FATF Guidelines", "GDPR", "SOC 2"] },
];

const investmentBanking: AttributeTemplate[] = [
  { industryId: "investment-banking", category: "license_type", label: "License Type", group: "compliance", suggestedValues: ["Broker-Dealer License", "Investment Firm License", "MiFID II Authorization", "SEC Registration"] },
  { industryId: "investment-banking", category: "products", label: "Products", group: "technographic", suggestedValues: ["M&A Advisory", "Equity Underwriting", "Debt Underwriting", "Structured Products", "Prime Brokerage", "Equity Research"] },
  { industryId: "investment-banking", category: "target_market", label: "Target Market", group: "firmographic", suggestedValues: ["LATAM", "EU", "SEA", "Africa", "MENA", "US", "UK", "Global"] },
];

const regtech: AttributeTemplate[] = [
  { industryId: "regtech", category: "products", label: "Products", group: "technographic", suggestedValues: ["KYC/KYB Verification", "Transaction Monitoring", "Regulatory Reporting", "Sanctions Screening", "Risk Assessment", "Compliance Workflow"] },
  { industryId: "regtech", category: "target_market", label: "Target Market", group: "firmographic", suggestedValues: ["LATAM", "EU", "SEA", "Africa", "MENA", "US", "UK", "Global"] },
  { industryId: "regtech", category: "compliance_framework", label: "Compliance Framework", group: "compliance", suggestedValues: ["AML/KYC", "GDPR", "SOC 2", "ISO 27001", "FATF Guidelines", "PSD2"] },
];

const insurtech: AttributeTemplate[] = [
  { industryId: "insurtech", category: "license_type", label: "License Type", group: "compliance", suggestedValues: ["MGA License", "Broker License", "Full Carrier License", "Coverholder", "Sandbox License"] },
  { industryId: "insurtech", category: "products", label: "Products", group: "technographic", suggestedValues: ["Claims Automation", "Underwriting AI", "Embedded Insurance", "Parametric Insurance", "On-Demand Insurance", "Digital Distribution"] },
  { industryId: "insurtech", category: "target_market", label: "Target Market", group: "firmographic", suggestedValues: ["LATAM", "EU", "SEA", "Africa", "MENA", "US", "UK", "Global"] },
];

const wealthtech: AttributeTemplate[] = [
  { industryId: "wealthtech", category: "license_type", label: "License Type", group: "compliance", suggestedValues: ["RIA Registration", "Investment Advisor License", "MiFID II Authorization", "Broker-Dealer License"] },
  { industryId: "wealthtech", category: "products", label: "Products", group: "technographic", suggestedValues: ["Robo-Advisory", "Portfolio Management", "Fractional Investing", "Tax-Loss Harvesting", "Social Trading", "Retirement Planning"] },
  { industryId: "wealthtech", category: "target_market", label: "Target Market", group: "firmographic", suggestedValues: ["LATAM", "EU", "SEA", "Africa", "MENA", "US", "UK", "Global"] },
];

// ---------------------------------------------------------------------------
// Sector 2: Technology
// ---------------------------------------------------------------------------

const saas: AttributeTemplate[] = [
  { industryId: "saas", category: "deployment_model", label: "Deployment Model", group: "technographic", suggestedValues: ["SaaS", "On-Premise", "Hybrid", "Self-Hosted"] },
  { industryId: "saas", category: "pricing_model", label: "Pricing Model", group: "firmographic", suggestedValues: ["Per-Seat", "Usage-Based", "Flat Rate", "Freemium", "Tiered"] },
  { industryId: "saas", category: "target_audience", label: "Target Audience", group: "firmographic", suggestedValues: ["SMB", "Mid-Market", "Enterprise", "Developer", "Startup"] },
  { industryId: "saas", category: "products", label: "Products", group: "technographic", suggestedValues: ["CRM", "ERP", "HR Platform", "Marketing Automation", "Project Management", "Analytics", "Communication"] },
];

const cybersecurity: AttributeTemplate[] = [
  { industryId: "cybersecurity", category: "deployment_model", label: "Deployment Model", group: "technographic", suggestedValues: ["SaaS", "On-Premise", "Hybrid", "Self-Hosted"] },
  { industryId: "cybersecurity", category: "pricing_model", label: "Pricing Model", group: "firmographic", suggestedValues: ["Per-Seat", "Usage-Based", "Flat Rate", "Per-Endpoint", "Per-Asset"] },
  { industryId: "cybersecurity", category: "target_audience", label: "Target Audience", group: "firmographic", suggestedValues: ["SMB", "Mid-Market", "Enterprise", "Government", "Critical Infrastructure"] },
  { industryId: "cybersecurity", category: "products", label: "Products", group: "technographic", suggestedValues: ["SIEM", "EDR/XDR", "IAM", "CASB", "Vulnerability Management", "Pen Testing", "Zero Trust", "DLP"] },
];

const aiMl: AttributeTemplate[] = [
  { industryId: "ai-ml", category: "deployment_model", label: "Deployment Model", group: "technographic", suggestedValues: ["SaaS", "On-Premise", "Hybrid", "Self-Hosted", "API-Only"] },
  { industryId: "ai-ml", category: "pricing_model", label: "Pricing Model", group: "firmographic", suggestedValues: ["Per-Seat", "Usage-Based", "Per-Token", "Flat Rate", "Freemium"] },
  { industryId: "ai-ml", category: "target_audience", label: "Target Audience", group: "firmographic", suggestedValues: ["SMB", "Mid-Market", "Enterprise", "Developer", "Researcher"] },
  { industryId: "ai-ml", category: "products", label: "Products", group: "technographic", suggestedValues: ["LLM Platform", "Computer Vision", "NLP", "MLOps", "Predictive Analytics", "Conversational AI", "AI Agents"] },
];

const cloudInfrastructure: AttributeTemplate[] = [
  { industryId: "cloud-infrastructure", category: "deployment_model", label: "Deployment Model", group: "technographic", suggestedValues: ["SaaS", "On-Premise", "Hybrid", "Self-Hosted", "Multi-Cloud"] },
  { industryId: "cloud-infrastructure", category: "pricing_model", label: "Pricing Model", group: "firmographic", suggestedValues: ["Usage-Based", "Reserved Capacity", "Flat Rate", "Pay-As-You-Go"] },
  { industryId: "cloud-infrastructure", category: "target_audience", label: "Target Audience", group: "firmographic", suggestedValues: ["SMB", "Mid-Market", "Enterprise", "Developer", "Startup"] },
  { industryId: "cloud-infrastructure", category: "products", label: "Products", group: "technographic", suggestedValues: ["Compute", "Storage", "CDN", "Serverless", "Kubernetes", "Database-as-a-Service", "Networking"] },
];

const devtools: AttributeTemplate[] = [
  { industryId: "devtools", category: "deployment_model", label: "Deployment Model", group: "technographic", suggestedValues: ["SaaS", "On-Premise", "Hybrid", "Self-Hosted", "CLI/Local"] },
  { industryId: "devtools", category: "pricing_model", label: "Pricing Model", group: "firmographic", suggestedValues: ["Per-Seat", "Usage-Based", "Flat Rate", "Freemium", "Open-Source + Enterprise"] },
  { industryId: "devtools", category: "target_audience", label: "Target Audience", group: "firmographic", suggestedValues: ["Developer", "SMB", "Mid-Market", "Enterprise", "Open-Source Community"] },
  { industryId: "devtools", category: "products", label: "Products", group: "technographic", suggestedValues: ["CI/CD", "Code Review", "IDE/Editor", "Monitoring", "APM", "Feature Flags", "Testing", "Documentation"] },
];

// ---------------------------------------------------------------------------
// Sector 3: Gaming & Betting
// ---------------------------------------------------------------------------

const igaming: AttributeTemplate[] = [
  { industryId: "igaming", category: "license_jurisdiction", label: "License Jurisdiction", group: "compliance", suggestedValues: ["Malta (MGA)", "Curacao", "Gibraltar", "UK (UKGC)", "Isle of Man", "Alderney", "Kahnawake", "Sweden", "Denmark"] },
  { industryId: "igaming", category: "game_types", label: "Game Types", group: "technographic", suggestedValues: ["Slots", "Table Games", "Live Casino", "Sports Betting", "Poker", "Bingo", "Lottery", "Virtual Sports"] },
  { industryId: "igaming", category: "revenue_model", label: "Revenue Model", group: "firmographic", suggestedValues: ["GGR (Gross Gaming Revenue)", "B2B Platform Fee", "Revenue Share", "Turnkey License", "White-Label"] },
];

const onlineCasinos: AttributeTemplate[] = [
  { industryId: "online-casinos", category: "license_jurisdiction", label: "License Jurisdiction", group: "compliance", suggestedValues: ["Malta (MGA)", "Curacao", "Gibraltar", "UK (UKGC)", "Isle of Man", "Alderney", "Sweden", "Ontario"] },
  { industryId: "online-casinos", category: "game_types", label: "Game Types", group: "technographic", suggestedValues: ["Slots", "Live Casino", "Table Games", "Jackpot Games", "Crash Games", "Game Shows", "Scratch Cards"] },
  { industryId: "online-casinos", category: "revenue_model", label: "Revenue Model", group: "firmographic", suggestedValues: ["GGR (Gross Gaming Revenue)", "White-Label Operator", "Affiliate Program", "VIP/High-Roller"] },
  { industryId: "online-casinos", category: "compliance_framework", label: "Compliance Framework", group: "compliance", suggestedValues: ["Responsible Gambling", "AML/KYC", "RNG Certification", "GDPR", "Player Protection"] },
];

const sportsBetting: AttributeTemplate[] = [
  { industryId: "sports-betting", category: "license_jurisdiction", label: "License Jurisdiction", group: "compliance", suggestedValues: ["Malta (MGA)", "Curacao", "Gibraltar", "UK (UKGC)", "Isle of Man", "US State Licenses", "Ontario", "Colombia"] },
  { industryId: "sports-betting", category: "game_types", label: "Game Types", group: "technographic", suggestedValues: ["Pre-Match Betting", "Live/In-Play Betting", "Parlays/Accumulators", "Prop Bets", "Futures", "Exchange Betting"] },
  { industryId: "sports-betting", category: "revenue_model", label: "Revenue Model", group: "firmographic", suggestedValues: ["Margin/Overround", "B2B Data Feed Licensing", "White-Label Sportsbook", "Affiliate Revenue Share"] },
  { industryId: "sports-betting", category: "compliance_framework", label: "Compliance Framework", group: "compliance", suggestedValues: ["Responsible Gambling", "AML/KYC", "Integrity Monitoring", "GDPR", "Advertising Restrictions"] },
];

const esports: AttributeTemplate[] = [
  { industryId: "esports", category: "license_jurisdiction", label: "License Jurisdiction", group: "compliance", suggestedValues: ["Malta (MGA)", "Curacao", "Gibraltar", "UK (UKGC)", "Isle of Man"] },
  { industryId: "esports", category: "game_types", label: "Game Types", group: "technographic", suggestedValues: ["CS2 Betting", "Dota 2 Betting", "LoL Betting", "Valorant Betting", "Skin Betting", "Fantasy Esports", "Tournament Platforms"] },
  { industryId: "esports", category: "revenue_model", label: "Revenue Model", group: "firmographic", suggestedValues: ["Betting Margin", "Tournament Entry Fees", "Sponsorship", "Media Rights", "Merchandise"] },
];

const gameDevelopment: AttributeTemplate[] = [
  { industryId: "game-development", category: "game_types", label: "Game Types", group: "technographic", suggestedValues: ["Mobile Games", "PC Games", "Console Games", "Browser Games", "VR/AR Games", "Casual/Hyper-Casual", "AAA Titles"] },
  { industryId: "game-development", category: "revenue_model", label: "Revenue Model", group: "firmographic", suggestedValues: ["Premium (Pay-to-Play)", "Free-to-Play (Microtransactions)", "Subscription", "Ad-Supported", "Season Pass", "Play-to-Earn"] },
  { industryId: "game-development", category: "target_market", label: "Target Market", group: "firmographic", suggestedValues: ["LATAM", "EU", "SEA", "Africa", "MENA", "US", "UK", "Global"] },
];

// ---------------------------------------------------------------------------
// Sector 4: E-commerce & Marketplaces
// ---------------------------------------------------------------------------

const ecommercePlatforms: AttributeTemplate[] = [
  { industryId: "e-commerce-platforms", category: "payment_methods", label: "Payment Methods", group: "technographic", suggestedValues: ["Cards", "Crypto", "BNPL", "Wallets", "Bank Transfer", "Cash on Delivery", "Mobile Money"] },
  { industryId: "e-commerce-platforms", category: "fulfillment_model", label: "Fulfillment Model", group: "technographic", suggestedValues: ["Self-Fulfilled", "3PL", "Dropshipping", "FBA/Marketplace Fulfillment", "Hybrid", "Digital Delivery"] },
  { industryId: "e-commerce-platforms", category: "market_type", label: "Market Type", group: "firmographic", suggestedValues: ["B2B", "B2C", "C2C", "B2B2C"] },
  { industryId: "e-commerce-platforms", category: "products", label: "Products", group: "technographic", suggestedValues: ["Storefront Builder", "Shopping Cart", "Checkout", "Inventory Management", "Order Management", "Headless Commerce"] },
];

const marketplaces: AttributeTemplate[] = [
  { industryId: "marketplaces", category: "payment_methods", label: "Payment Methods", group: "technographic", suggestedValues: ["Cards", "Crypto", "BNPL", "Wallets", "Bank Transfer", "Escrow", "Mobile Money"] },
  { industryId: "marketplaces", category: "fulfillment_model", label: "Fulfillment Model", group: "technographic", suggestedValues: ["Seller-Fulfilled", "Platform-Fulfilled", "Hybrid", "Digital Delivery", "Service-Based"] },
  { industryId: "marketplaces", category: "market_type", label: "Market Type", group: "firmographic", suggestedValues: ["B2B", "B2C", "C2C", "B2B2C"] },
  { industryId: "marketplaces", category: "revenue_model", label: "Revenue Model", group: "firmographic", suggestedValues: ["Commission/Take Rate", "Listing Fees", "Subscription", "Featured Placement", "Transaction Fee"] },
];

const affiliateNetworks: AttributeTemplate[] = [
  { industryId: "affiliate-networks", category: "payment_methods", label: "Payment Methods", group: "technographic", suggestedValues: ["Cards", "Crypto", "Wallets", "Bank Transfer", "PayPal"] },
  { industryId: "affiliate-networks", category: "market_type", label: "Market Type", group: "firmographic", suggestedValues: ["B2B", "B2C", "B2B2C"] },
  { industryId: "affiliate-networks", category: "revenue_model", label: "Revenue Model", group: "firmographic", suggestedValues: ["CPA (Cost Per Action)", "CPC (Cost Per Click)", "CPL (Cost Per Lead)", "Revenue Share", "Hybrid"] },
  { industryId: "affiliate-networks", category: "payout_model", label: "Payout Model", group: "technographic", suggestedValues: ["Net-30", "Net-60", "Weekly", "Bi-Weekly", "On Threshold", "Real-Time"] },
];

const d2cBrands: AttributeTemplate[] = [
  { industryId: "d2c-brands", category: "payment_methods", label: "Payment Methods", group: "technographic", suggestedValues: ["Cards", "Crypto", "BNPL", "Wallets", "Bank Transfer", "Cash on Delivery"] },
  { industryId: "d2c-brands", category: "fulfillment_model", label: "Fulfillment Model", group: "technographic", suggestedValues: ["Self-Fulfilled", "3PL", "Hybrid", "Subscription Box", "Made-to-Order"] },
  { industryId: "d2c-brands", category: "market_type", label: "Market Type", group: "firmographic", suggestedValues: ["B2C", "B2B2C"] },
];

const dropshipping: AttributeTemplate[] = [
  { industryId: "dropshipping", category: "payment_methods", label: "Payment Methods", group: "technographic", suggestedValues: ["Cards", "Crypto", "BNPL", "Wallets", "Bank Transfer", "Cash on Delivery"] },
  { industryId: "dropshipping", category: "fulfillment_model", label: "Fulfillment Model", group: "technographic", suggestedValues: ["Supplier-Direct", "AliExpress/1688", "Print-on-Demand", "Private Label Dropship", "Multi-Supplier Aggregation"] },
  { industryId: "dropshipping", category: "market_type", label: "Market Type", group: "firmographic", suggestedValues: ["B2C", "B2B2C"] },
];

// ---------------------------------------------------------------------------
// Sector 5: Creator & Gig Economy
// ---------------------------------------------------------------------------

const creatorPlatforms: AttributeTemplate[] = [
  { industryId: "creator-platforms", category: "payout_model", label: "Payout Model", group: "technographic", suggestedValues: ["Revenue Share", "Tips/Donations", "Subscription Splits", "Ad Revenue Share", "Direct Payouts", "Milestone-Based"] },
  { industryId: "creator-platforms", category: "creator_type", label: "Creator Type", group: "firmographic", suggestedValues: ["Video Creators", "Streamers", "Writers/Bloggers", "Podcasters", "Musicians", "Visual Artists", "Educators"] },
  { industryId: "creator-platforms", category: "payment_methods", label: "Payment Methods", group: "technographic", suggestedValues: ["Cards", "Crypto", "Wallets", "Bank Transfer", "PayPal", "Mobile Money"] },
];

const freelanceMarketplaces: AttributeTemplate[] = [
  { industryId: "freelance-marketplaces", category: "payout_model", label: "Payout Model", group: "technographic", suggestedValues: ["Escrow + Milestone", "Hourly Billing", "Fixed-Price Release", "Instant Payout", "Weekly Auto-Withdraw"] },
  { industryId: "freelance-marketplaces", category: "creator_type", label: "Creator Type", group: "firmographic", suggestedValues: ["Software Developers", "Designers", "Writers", "Virtual Assistants", "Consultants", "Data Specialists", "Translators"] },
  { industryId: "freelance-marketplaces", category: "market_type", label: "Market Type", group: "firmographic", suggestedValues: ["B2B", "B2C", "C2C"] },
  { industryId: "freelance-marketplaces", category: "revenue_model", label: "Revenue Model", group: "firmographic", suggestedValues: ["Service Fee (Both Sides)", "Client-Side Fee", "Freelancer-Side Fee", "Subscription", "Featured Listings"] },
];

const gigPlatforms: AttributeTemplate[] = [
  { industryId: "gig-platforms", category: "payout_model", label: "Payout Model", group: "technographic", suggestedValues: ["Per-Task Payout", "Daily Earnings", "Weekly Settlement", "Instant Cash-Out", "Tip Pooling"] },
  { industryId: "gig-platforms", category: "creator_type", label: "Creator Type", group: "firmographic", suggestedValues: ["Drivers", "Couriers", "Cleaners", "Handymen", "Pet Sitters", "Tutors", "Task Workers"] },
  { industryId: "gig-platforms", category: "market_type", label: "Market Type", group: "firmographic", suggestedValues: ["B2C", "C2C", "B2B2C"] },
  { industryId: "gig-platforms", category: "payment_methods", label: "Payment Methods", group: "technographic", suggestedValues: ["Cards", "Wallets", "Bank Transfer", "Mobile Money", "Cash"] },
];

const contentMonetization: AttributeTemplate[] = [
  { industryId: "content-monetization", category: "payout_model", label: "Payout Model", group: "technographic", suggestedValues: ["Ad Revenue Share", "Subscription Revenue Share", "Pay-Per-View", "Tipping", "Sponsorship Splits", "NFT Royalties"] },
  { industryId: "content-monetization", category: "creator_type", label: "Creator Type", group: "firmographic", suggestedValues: ["Newsletter Writers", "Course Creators", "Membership Site Operators", "Digital Product Sellers", "Community Leaders", "Coaches"] },
  { industryId: "content-monetization", category: "payment_methods", label: "Payment Methods", group: "technographic", suggestedValues: ["Cards", "Crypto", "Wallets", "Bank Transfer", "PayPal", "In-App Purchases"] },
];

// ---------------------------------------------------------------------------
// Combined export
// ---------------------------------------------------------------------------

export const ATTRIBUTE_TEMPLATES: AttributeTemplate[] = [
  // Financial Services
  ...fintech,
  ...neobanking,
  ...paymentProcessing,
  ...banking,
  ...insurance,
  ...lending,
  ...cryptoBlockchain,
  ...investmentBanking,
  ...regtech,
  ...insurtech,
  ...wealthtech,
  // Technology
  ...saas,
  ...cybersecurity,
  ...aiMl,
  ...cloudInfrastructure,
  ...devtools,
  // Gaming & Betting
  ...igaming,
  ...onlineCasinos,
  ...sportsBetting,
  ...esports,
  ...gameDevelopment,
  // E-commerce & Marketplaces
  ...ecommercePlatforms,
  ...marketplaces,
  ...affiliateNetworks,
  ...d2cBrands,
  ...dropshipping,
  // Creator & Gig Economy
  ...creatorPlatforms,
  ...freelanceMarketplaces,
  ...gigPlatforms,
  ...contentMonetization,
];
