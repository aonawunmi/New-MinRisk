export interface RecommendedSource {
    name: string;
    url: string;
    category: string;
    description: string;
}

export const RECOMMENDED_SOURCES: RecommendedSource[] = [
    // --- Cybersecurity ---
    {
        name: "Krebs on Security",
        url: "https://krebsonsecurity.com/feed/",
        category: "cybersecurity",
        description: "In-depth investigative journalism on cybercrime and security."
    },
    {
        name: "The Hacker News",
        url: "https://feeds.feedburner.com/TheHackersNews",
        category: "cybersecurity",
        description: "Real-time news on hacking, cyber attacks, and security trends."
    },
    {
        name: "Dark Reading",
        url: "https://www.darkreading.com/rss.xml",
        category: "cybersecurity",
        description: "News and analysis for information security professionals."
    },
    {
        name: "CISA Alerts",
        url: "https://www.cisa.gov/cybersecurity-advisories/all.xml",
        category: "cybersecurity",
        description: "Official alerts from the US Cybersecurity and Infrastructure Security Agency."
    },

    // --- Regulatory & Compliance ---
    {
        name: "SEC News (US)",
        url: "https://www.sec.gov/news/press-release.xml",
        category: "regulatory",
        description: "Press releases from the US Securities and Exchange Commission."
    },
    {
        name: "FINRA News",
        url: "https://www.finra.org/rss/news-releases",
        category: "regulatory",
        description: "News releases from the Financial Industry Regulatory Authority."
    },

    // --- Nigerian Regulators ---
    {
        name: "Central Bank of Nigeria (CBN)",
        url: "https://www.cbn.gov.ng/rss/news.xml",
        category: "regulatory",
        description: "Monetary policy, banking regulations, and directives from the CBN."
    },
    {
        name: "SEC Nigeria",
        url: "https://sec.gov.ng/feed/",
        category: "regulatory",
        description: "Capital markets regulation and investor protection from the Nigerian SEC."
    },
    {
        name: "NGX Group",
        url: "https://ngxgroup.com/feed/",
        category: "market",
        description: "Nigerian Exchange Group — stock exchange news, listings, and market updates."
    },
    {
        name: "NDIC",
        url: "https://ndic.gov.ng/feed/",
        category: "regulatory",
        description: "Nigeria Deposit Insurance Corporation — banking sector stability and deposit protection."
    },
    {
        name: "PENCOM",
        url: "https://www.pencom.gov.ng/feed/",
        category: "regulatory",
        description: "National Pension Commission — pension industry regulation and compliance."
    },
    {
        name: "FMDQ Group",
        url: "https://fmdqgroup.com/feed/",
        category: "market",
        description: "FMDQ Securities Exchange — fixed income, currency, and derivatives market news."
    },

    // --- Nigerian Business & Financial News ---
    {
        name: "Nairametrics",
        url: "https://nairametrics.com/feed/",
        category: "market",
        description: "Nigeria's leading financial and business analysis platform."
    },
    {
        name: "BusinessDay Nigeria",
        url: "https://businessday.ng/feed/",
        category: "market",
        description: "Nigerian business intelligence, economy, and financial markets coverage."
    },
    {
        name: "Premium Times Nigeria",
        url: "https://www.premiumtimesng.com/feed",
        category: "geopolitical",
        description: "Award-winning Nigerian investigative journalism and national affairs."
    },
    {
        name: "The Guardian Nigeria",
        url: "https://guardian.ng/feed/",
        category: "geopolitical",
        description: "Major Nigerian newspaper covering business, politics, and national news."
    },

    // --- Global Financial Markets ---
    {
        name: "Bloomberg Markets",
        url: "https://feeds.bloomberg.com/markets/news.rss",
        category: "market",
        description: "Global financial market news and analysis."
    },
    {
        name: "Financial Times - Markets",
        url: "https://www.ft.com/markets?format=rss",
        category: "market",
        description: "Market news from the Financial Times."
    },

    // --- Operational & Tech ---
    {
        name: "TechCrunch",
        url: "https://techcrunch.com/feed/",
        category: "technology",
        description: "Latest technology news and startup trends."
    },
    {
        name: "CIO.com",
        url: "https://www.cio.com/feed/",
        category: "operational",
        description: "Strategic insights for Chief Information Officers."
    },

    // --- Geopolitical & Environmental ---
    {
        name: "Reuters - World News",
        url: "https://feeds.reuters.com/Reuters/worldNews",
        category: "geopolitical",
        description: "Breaking world news and international affairs."
    },
    {
        name: "UN Environment Programme",
        url: "https://www.unep.org/news-and-stories/rss.xml",
        category: "environmental",
        description: "Updates on global environmental issues."
    }
];
