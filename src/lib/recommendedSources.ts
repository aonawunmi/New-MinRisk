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
        name: "SEC News",
        url: "https://www.sec.gov/news/press-release.xml",
        category: "regulatory",
        description: "Press releases from the US Securities and Exchange Commission."
    },
    {
        name: "Central Bank of Nigeria",
        url: "https://www.cbn.gov.ng/rss/news.xml",
        category: "regulatory",
        description: "News and updates from the Central Bank of Nigeria."
    },
    {
        name: "FINRA News",
        url: "https://www.finra.org/rss/news-releases",
        category: "regulatory",
        description: "News releases from the Financial Industry Regulatory Authority."
    },

    // --- Financial Market ---
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
    {
        name: "FMDQ Group",
        url: "https://fmdqgroup.com/feed/",
        category: "market",
        description: "News from FMDQ Securities Exchange."
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
