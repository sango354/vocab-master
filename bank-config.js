const APP_VERSION = "v4.2.1";

const distractorBank = {
  "n.": [
    "budget", "profit", "contract", "client", "meeting", "schedule", "equipment", "department",
    "suggestion", "cargo", "application", "reward", "commuter", "aisle", "receipt", "prescription",
    "groceries", "laundry", "detergent", "reservation", "discount", "bill", "neighbor", "achievement"
  ],
  "v.": [
    "implement", "evaluate", "negotiate", "compensate", "commute", "arrange", "submit", "maintain",
    "improve", "mitigate", "repair", "cancel", "recommend", "confirm", "compare", "delay"
  ],
  "adj.": [
    "temporary", "widespread", "resilient", "ambiguous", "inevitable", "plausible",
    "efficient", "accurate", "flexible", "formal", "convenient", "reliable", "crowded", "patient"
  ]
};

const bankCatalog = {
  toeic: {
    label: "TOEIC \u5546\u52d9\u5b57\u5f59",
    description: "\u8077\u5834\u3001\u6703\u8b70\u3001\u7269\u6d41\u8207\u5546\u52d9\u60c5\u5883\u7df4\u7fd2\u3002",
    path: "./rich-banks-release/toeic.json",
    version: 4
  },
  school7000: {
    label: "\u9ad8\u4e2d 7000 \u5b57",
    description: "\u95b1\u8b80\u3001\u5beb\u4f5c\u8207\u5b78\u79d1\u5e38\u898b\u6838\u5fc3\u82f1\u6587\u8a5e\u5f59\u3002",
    path: "./rich-banks-release/school7000.json",
    version: 4
  },
  dailyLife: {
    label: "\u65e5\u5e38\u751f\u6d3b\u5b57\u5f59",
    description: "\u8cfc\u7269\u3001\u4ea4\u901a\u3001\u5c45\u5bb6\u8207\u65c5\u884c\u5e38\u7528\u5b57\u3002",
    path: "./rich-banks-release/dailyLife.json",
    version: 4
  }
};
