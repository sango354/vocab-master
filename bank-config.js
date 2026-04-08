const APP_VERSION = "v4.2.0";

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
    label: "TOEIC 商務字彙",
    description: "職場、會議、客服、物流與商務情境練習。",
    path: "./rich-banks-release/toeic.json",
    version: 4
  },
  school7000: {
    label: "高中 7000 字",
    description: "閱讀、寫作與學科常見核心英文詞彙。",
    path: "./rich-banks-release/school7000.json",
    version: 4
  },
  dailyLife: {
    label: "日常生活字彙",
    description: "購物、交通、居家、健康與社交常用字。",
    path: "./rich-banks-release/dailyLife.json",
    version: 4
  }
};
