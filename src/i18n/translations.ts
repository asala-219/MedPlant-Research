export type Lang = "en" | "ar";

export const t = {
  en: {
    // Nav
    nav_home: "Home",
    nav_database: "Database",
    nav_graph: "Knowledge Graph",
    nav_chat: "Ask AI",
    nav_subtitle: "Oman's Ethnomedicinal Plants",

    // Hero
    hero_title: "Oman's Ethnomedicinal Plant Knowledge Graph",
    hero_desc:
      "A digital home for Oman's healing plant tradition — combining a structured database with a relational knowledge graph to let researchers, clinicians, and the public explore 180 plants, 437 compounds, and 40 medical conditions.",

    // Stats
    stat_plants: "Plants",
    stat_compounds: "Phytochemicals",
    stat_conditions: "Medical Conditions",
    stat_families: "Plant Families",
    stat_graph_nodes: "Graph Nodes",
    stat_graph_edges: "Graph Edges",

    // Table
    table_title: "Plant Registry",
    table_subtitle: "Search and filter the complete ethnomedicinal plant database",
    search_placeholder: "Search by name, local name, family…",
    filter_condition: "Filter by condition",
    filter_family: "Filter by family",
    col_family: "Family",
    col_plant: "Plant",
    col_local: "Local Name",
    col_part: "Part Used",
    col_use: "Traditional Use",
    col_compounds: "Compounds",
    col_conditions: "Conditions",
    col_source: "Source",
    view_profile: "View Profile",
    all_conditions: "All Conditions",
    all_families: "All Families",
    showing: "Showing",
    of: "of",
    results: "results",
    load_more: "Load More",

    // Plant detail
    plant_detail_title: "Plant Profile",
    back: "← Back",
    scientific: "Scientific Name",
    local: "Local Name",
    family: "Family",
    part_used: "Part Used",
    traditional_use: "Traditional Use",
    conditions_treated: "Conditions Treated",
    phytochemicals: "Phytochemical Compounds",
    related_plants: "Related Plants",
    source: "Source",
    no_image: "No image available",

    // Graph
    graph_title: "Knowledge Graph Explorer",
    graph_subtitle: "Visualize relationships between plants, conditions, and compounds",
    graph_search_placeholder: "Search a plant, condition, or compound…",
    show_full: "Show Full Graph",
    show_plants_conditions: "Plants + Conditions",
    show_plants_compounds: "Plants + Compounds",
    node_plant: "Plant",
    node_condition: "Condition",
    node_compound: "Compound",
    node_family: "Family",
    graph_tip: "Hover a node to spotlight its connections. Click to inspect. Drag to reposition. Scroll to zoom.",

    // Chat
    chat_title: "Ask OmaniEthno AI",
    chat_subtitle: "Ask questions about Oman's ethnomedicinal plants in English or Arabic",
    chat_placeholder: "e.g. What plants treat diabetes in Oman?",
    send: "Send",
    chat_disclaimer: "AI answers are based on the knowledge graph and for research purposes only — not medical advice.",
    thinking: "Thinking…",

    // Features
    feat1_title: "Structured Database",
    feat1_desc: "Fully searchable and filterable table of 180 plants with taxonomy, traditional uses, and phytochemicals.",
    feat2_title: "Knowledge Graph",
    feat2_desc: "Interactive D3 force-graph mapping Plants → Conditions → Compounds → Families.",
    feat3_title: "GraphRAG Chatbot",
    feat3_desc: "Ask natural-language questions; a local LLM via Ollama answers using the knowledge graph.",
    feat4_title: "Bilingual",
    feat4_desc: "Full Arabic and English interface for Omani and international audiences.",

    // Misc
    no_data: "No data available",
    loading: "Loading…",
    error: "Something went wrong. Is the FastAPI backend running?",
  },
  ar: {
    nav_home: "الرئيسية",
    nav_database: "قاعدة البيانات",
    nav_graph: "خريطة المعرفة",
    nav_chat: "اسأل الذكاء الاصطناعي",
    nav_subtitle: "النباتات الطبية العُمانية",

    hero_title: "خريطة معرفة النباتات الطبية العُمانية",
    hero_desc:
      "منصة رقمية لإحياء تراث النبات العلاجي العُماني — تجمع بين قاعدة بيانات هيكلية وخريطة معرفية علائقية تتيح للباحثين والأطباء والجمهور استكشاف ١٨٠ نباتًا و٤٣٧ مركبًا و٤٠ حالةً طبية.",

    stat_plants: "نبات",
    stat_compounds: "مركب كيميائي",
    stat_conditions: "حالة طبية",
    stat_families: "عائلة نباتية",
    stat_graph_nodes: "عقدة في الخريطة",
    stat_graph_edges: "ارتباط في الخريطة",

    table_title: "سجل النباتات",
    table_subtitle: "ابحث وفلتر قاعدة البيانات الكاملة للنباتات الطبية",
    search_placeholder: "البحث بالاسم أو الاسم المحلي أو العائلة…",
    filter_condition: "تصفية حسب الحالة",
    filter_family: "تصفية حسب العائلة",
    col_family: "العائلة",
    col_plant: "النبات",
    col_local: "الاسم المحلي",
    col_part: "الجزء المستخدم",
    col_use: "الاستخدام التقليدي",
    col_compounds: "المركبات",
    col_conditions: "الحالات",
    col_source: "المصدر",
    view_profile: "عرض الملف",
    all_conditions: "جميع الحالات",
    all_families: "جميع العائلات",
    showing: "عرض",
    of: "من",
    results: "نتيجة",
    load_more: "تحميل المزيد",

    plant_detail_title: "ملف النبات",
    back: "← رجوع",
    scientific: "الاسم العلمي",
    local: "الاسم المحلي",
    family: "العائلة",
    part_used: "الجزء المستخدم",
    traditional_use: "الاستخدام التقليدي",
    conditions_treated: "الحالات المعالجة",
    phytochemicals: "المركبات الكيميائية النباتية",
    related_plants: "النباتات ذات الصلة",
    source: "المصدر",
    no_image: "لا تتوفر صورة",

    graph_title: "مستكشف خريطة المعرفة",
    graph_subtitle: "تصور العلاقات بين النباتات والحالات والمركبات",
    graph_search_placeholder: "ابحث عن نبات أو حالة أو مركب…",
    show_full: "الخريطة الكاملة",
    show_plants_conditions: "النباتات والحالات",
    show_plants_compounds: "النباتات والمركبات",
    node_plant: "نبات",
    node_condition: "حالة طبية",
    node_compound: "مركب",
    node_family: "عائلة",
    graph_tip: "مرّر فوق أي عقدة لإبراز ارتباطاتها. انقر لفحصها. اسحب لإعادة الموضع. مرّر للتكبير.",

    chat_title: "اسأل مساعد النباتات الطبية",
    chat_subtitle: "اطرح أسئلة حول النباتات الطبية العُمانية بالعربية أو الإنجليزية",
    chat_placeholder: "مثال: ما النباتات التي تعالج السكري في عُمان؟",
    send: "إرسال",
    chat_disclaimer: "إجابات الذكاء الاصطناعي مستندة إلى خريطة المعرفة وتهدف للبحث العلمي فقط — وليست نصيحة طبية.",
    thinking: "يفكر…",

    feat1_title: "قاعدة بيانات هيكلية",
    feat1_desc: "جدول قابل للبحث والتصفية لـ١٨٠ نباتًا مع التصنيف والاستخدامات والمركبات.",
    feat2_title: "خريطة المعرفة",
    feat2_desc: "رسم بياني تفاعلي يربط النباتات بالحالات الطبية والمركبات والعائلات.",
    feat3_title: "مساعد ذكي",
    feat3_desc: "اطرح أسئلة بلغة طبيعية؛ يسترجع النموذج الإجابات من خريطة المعرفة.",
    feat4_title: "ثنائي اللغة",
    feat4_desc: "واجهة كاملة بالعربية والإنجليزية للجمهور العُماني والدولي.",

    no_data: "لا توجد بيانات",
    loading: "جارٍ التحميل…",
    error: "حدث خطأ. هل خادم الـ FastAPI يعمل؟",
  },
} as const;

export function useTranslation(lang: Lang) {
  return t[lang];
}
