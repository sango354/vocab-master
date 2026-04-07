const distractorBank = [
  "強大的", "美麗的", "虛偽的", "聰明的", 
  "昂貴的", "複雜的", "危險的", "神秘的", 
  "困難的", "無聊的", "悲傷的", "快樂的",
  "增加", "減少", "破壞", "建設", "投資", "同意",
  "暫時的", "普遍的", "微小的", "實施", "收入", "通勤",
  "食品雜貨", "收據", "處方", "走道", "有彈性的"
];

const vocabularyBanks = {
  toeic: [
    { word: "Implement", phonetic: "/ˈɪmplɪment/", mean: "實施; 執行", pos: "v." },
    { word: "Revenue", phonetic: "/ˈrevənuː/", mean: "收入; 收益", pos: "n." },
    { word: "Commute", phonetic: "/kəˈmjuːt/", mean: "通勤", pos: "v." },
    { word: "Negotiate", phonetic: "/nɪˈɡoʊʃieɪt/", mean: "協商; 談判", pos: "v." },
    { word: "Compensate", phonetic: "/ˈkɑːmpenseɪt/", mean: "補償; 賠償", pos: "v." },
    { word: "Proposal", phonetic: "/prəˈpoʊzl/", mean: "提案", pos: "n." },
    { word: "Evaluate", phonetic: "/ɪˈvæljueɪt/", mean: "評估", pos: "v." }
  ],
  school7000: [
    { word: "Ephemeral", phonetic: "/ɪˈfem(ə)rəl/", mean: "短暫的", pos: "adj." },
    { word: "Ubiquitous", phonetic: "/juːˈbɪkwɪtəs/", mean: "無所不在的", pos: "adj." },
    { word: "Resilient", phonetic: "/rɪˈzɪliənt/", mean: "有彈性的; 韌性的", pos: "adj." },
    { word: "Mitigate", phonetic: "/ˈmɪtɪɡeɪt/", mean: "減輕; 緩和", pos: "v." },
    { word: "Ambiguous", phonetic: "/æmˈbɪɡjuəs/", mean: "模稜兩可的", pos: "adj." },
    { word: "Inevitable", phonetic: "/ɪnˈevɪtəbl/", mean: "不可避免的", pos: "adj." },
    { word: "Plausible", phonetic: "/ˈplɔːzəbl/", mean: "貌似合理的", pos: "adj." }
  ],
  dailyLife: [
    { word: "Grocery", phonetic: "/ˈɡroʊsəri/", mean: "食品雜貨", pos: "n." },
    { word: "Laundry", phonetic: "/ˈlɔːndri/", mean: "待洗衣物", pos: "n." },
    { word: "Prescription", phonetic: "/prɪˈskrɪpʃn/", mean: "處方", pos: "n." },
    { word: "Aisle", phonetic: "/aɪl/", mean: "走道", pos: "n." },
    { word: "Receipt", phonetic: "/rɪˈsiːt/", mean: "收據", pos: "n." },
    { word: "Commuter", phonetic: "/kəˈmjuːtər/", mean: "通勤者", pos: "n." },
    { word: "Detergent", phonetic: "/dɪˈtɜːrdʒənt/", mean: "清潔劑", pos: "n." }
  ]
};
