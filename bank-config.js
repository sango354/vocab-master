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
    label: "TOEIC Vocabulary",
    description: "Business and workplace vocabulary for test-style practice.",
    path: "./rich-banks-release/toeic.json",
    version: 4
  },
  school7000: {
    label: "School 7000",
    description: "Academic and reading vocabulary for general English study.",
    path: "./rich-banks-release/school7000.json",
    version: 4
  },
  dailyLife: {
    label: "Daily Life",
    description: "Everyday words for travel, shopping, home, and routines.",
    path: "./rich-banks-release/dailyLife.json",
    version: 4
  }
};
