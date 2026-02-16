
const nctbChapters = {
    "my-bengali-book": ["Chapter 1: আমার পরিচয়", "Chapter 2: আমরা যা করি", "Chapter 3: আমাদের পরিবার", "Chapter 4: আমাদের পরিবেশ", "Chapter 5: আমাদের দেশ"],
    "english-for-today": ["Unit 1: Greeting and Introduction", "Unit 2: Alphabet", "Unit 3: Numbers", "Unit 4: Commands", "Unit 5: Rhymes"],
    "primary-math": ["Chapter 1: সংখ্যা", "Chapter 2: যোগ", "Chapter 3: বিয়োগ", "Chapter 4: টাকা ও পয়সা", "Chapter 5: জ্যামিতি"],
    "bangladesh-global-studies": ["Chapter 1: আমাদের পরিবেশ ও সমাজ", "Chapter 2: আমাদের মুক্তিযুদ্ধ", "Chapter 3: আমাদের ইতিহাস", "Chapter 4: আমাদের সংস্কৃতি", "Chapter 5: আমাদের অর্থনীতি"],
    "primary-science": ["Chapter 1: আমাদের পরিবেশ", "Chapter 2: জীব ও জড়", "Chapter 3: মাটি ও পানি", "Chapter 4: বায়ু", "Chapter 5: পদার্থ ও শক্তি"],
    "islam-studies": ["Chapter 1: ইমান ও আকাইদ", "Chapter 2: ইবাদত", "Chapter 3: আখলাক", "Chapter 4: কুরআন মজিদ শিক্ষা", "Chapter 5: আদর্শ জীবন চরিত"],
    "math-6": ["Chapter 1: সংখ্যার গল্প", "Chapter 2: পূর্ণসংখ্যার জগৎ", "Chapter 3: মৌলিক উৎপাদকের গাছ", "Chapter 4: ভগ্নাংশের খেলা", "Chapter 5: ঐকিক নিয়ম ও শতকরা"],
    "science-6": ["Chapter 1: বৈজ্ঞানিক প্রক্রিয়া ও পরিমাপ", "Chapter 2: পৃথিবী ও মহাবিশ্ব", "Chapter 3: গতি", "Chapter 4: জীবের পুষ্টি", "Chapter 5: সালোকসংশ্লেষণ"],
    "ict-6": ["Chapter 1: তথ্য ও যোগাযোগ প্রযুক্তি পরিচিতি", "Chapter 2: তথ্য ও যোগাযোগ প্রযুক্তির যন্ত্রপাতি", "Chapter 3: তথ্য ও যোগাযোগ প্রযুক্তির নিরাপদ ব্যবহার", "Chapter 4: ওয়ার্ড প্রসেসিং", "Chapter 5: ইন্টারনেট পরিচিতি"],
    "bengali-grammar-6": ["Chapter 1: ভাষা ও বাংলা ভাষা", "Chapter 2: ধ্বনি ও বর্ণ", "Chapter 3: শব্দ ও পদ", "Chapter 4: লিঙ্গ ও বচন", "Chapter 5: সন্ধি"],
    "english-grammar-6": ["Chapter 1: Parts of Speech", "Chapter 2: Tense", "Chapter 3: Article", "Chapter 4: Preposition", "Chapter 5: Voice"],
    "charupath-6": ["Chapter 1: সততার পুরস্কার", "Chapter 2: আমাদের লোকশিল্প", "Chapter 3: রেইনকোট", "Chapter 4: মা", "Chapter 5: মানুষ জাতি"],
    "anandapath-6": ["Chapter 1: সাত ভাই চম্পা", "Chapter 2: ক্ষীরের পুতুল", "Chapter 3: আলাদীনের প্রদীপ", "Chapter 4: সিনবাদ", "Chapter 5: রবিনসন ক্রুসো"],
    "bgs-6": ["Chapter 1: বাংলাদেশের ইতিহাস", "Chapter 2: বাংলাদেশ ও বিশ্বসভ্যতা", "Chapter 3: বিশ্বভৌগোলিক পরিমণ্ডলে বাংলাদেশ", "Chapter 4: বাংলাদেশের জনসংখ্যা পরিচিতি", "Chapter 5: বাংলাদেশে নাগরিকত্ব"],
    "islam-6": ["Chapter 1: আকাইদ", "Chapter 2: ইবাদত", "Chapter 3: কুরআন ও হাদিস শিক্ষা", "Chapter 4: আখলাক", "Chapter 5: আদর্শ জীবন চরিত"],
    "agri-6": ["Chapter 1: আমাদের জীবনে কৃষি", "Chapter 2: কৃষি প্রযুক্তি ও যন্ত্রপাতি", "Chapter 3: কৃষি উপকরণ", "Chapter 4: কৃষি ও জলবায়ু", "Chapter 5: কৃষিজ উৎপাদন"],
    "physical-edu-6": ["Chapter 1: শরীরচর্চা ও সুস্থ জীবন", "Chapter 2: স্কাউটিং ও গার্ল গাইড", "Chapter 3: প্রজনন স্বাস্থ্য", "Chapter 4: আমাদের জীবনে খেলাধুলা", "Chapter 5: প্রাথমিক চিকিৎসা"],
    "work-life-6": ["Chapter 1: কর্মেই আনন্দ", "Chapter 2: আমাদের প্রয়োজনীয় কাজ", "Chapter 3: শিক্ষায় ও কর্মক্ষেত্রে সাফল্য", "Chapter 4: স্বাবলম্বী হবো", "Chapter 5: ভবিষ্যৎ পেশা ভাবনা"],
    "math-9-10": ["বাস্তব সংখ্যা", "সেট ও ফাংশন", "বীজগণিতিক রাশি", "সূচক ও লগারিদম", "এক চলকবিশিষ্ট সমীকরণ", "রেখা, কোণ ও ত্রিভুজ", "ব্যবহারিক জ্যামিতি", "বৃত্ত", "ত্রিকোণমিতিক অনুপাত", "দূরত্ব ও উচ্চতা", "বীজগণিতিক অনুপাত ও সমানুপাত", "দুই চলকবিশিষ্ট সরল সহসমীকরণ", "সসীম ধারা", "অনুপাত, সদৃশতা ও প্রতিসমতা", "ক্ষেত্রফল সম্পর্কিত উপপাদ্য ও সম্পাদ্য", "পরিমিতি", "পরিসংখ্যান"],
    "physics-9-10": ["ভৌত রাশি এবং পরিমাপ", "গতি", "বল", "কাজ, ক্ষমতা ও শক্তি", "পদার্থের অবস্থা ও চাপ", "বস্তুর ওপর তাপের প্রভাব", "তরঙ্গ ও শব্দ", "আলোর প্রতিফলন", "আলোর প্রতিসরণ", "স্থির তড়িৎ", "চল তড়িৎ", "বিদ্যুতের চৌম্বক ক্রিয়া", "আধুনিক পদার্থবিজ্ঞান ও ইলেকট্রনিক্স", "জীবন বাঁচাতে পদার্থবিজ্ঞান"],
    "higher-math-9-10": ["সেট ও ফাংশন", "বীজগণিতিক রাশি", "জ্যামিতি", "জ্যামিতিক অঙ্কন", "সমীকরণ", "অসমতা", "অসীম ধারা", "ত্রিকোণমিতি", "সূচকীয় ও লগারিদমীয় ফাংশন", "দ্বিপদী বিস্তৃতি", "স্থানাঙ্ক জ্যামিতি", "সমতলীয় ভেক্টর", "ঘন জ্যামিতি", "সম্ভাবনা"],
    // Default fallback chapters for unmapped subjects
    "default": ["Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4", "Chapter 5"]
};

// Heuristic function to map Bengali subject names to chapter keys
// This acts as a bridge between the requested Bengali subject names and our internal data keys
// Since I don't have the EXACT 2026 syllabus for every single valid subject, I'm providing a robust fallback system
export const getChaptersForSubject = (subjectName, className = "") => {
    if (!subjectName) return [];

    // Class 9-10 specific mapping
    if (className === "নবম-দশম শ্রেণি" || className.includes("নবম") || className.includes("দশম")) {
        if (subjectName.includes("উচ্চতর গণিত")) return nctbChapters["higher-math-9-10"];
        if (subjectName.includes("গণিত")) return nctbChapters["math-9-10"];
        if (subjectName.includes("পদার্থবিজ্ঞান")) return nctbChapters["physics-9-10"];
    }

    // General mapping
    if (subjectName.includes("উচ্চতর গণিত")) return nctbChapters["higher-math-9-10"]; // Fallback if class not specified but subject is unique enough
    if (subjectName.includes("বাংলা")) return nctbChapters["my-bengali-book"] || nctbChapters.default;
    if (subjectName.includes("English")) return nctbChapters["english-for-today"] || nctbChapters.default;
    if (subjectName.includes("প্রাথমিক গণিত")) return nctbChapters["primary-math"] || nctbChapters.default;
    if (subjectName.includes("গণিত")) return nctbChapters["math-6"] || nctbChapters["math-9-10"] || nctbChapters.default; // Default to class 6-8 math if not 9-10
    if (subjectName.includes("পদার্থবিজ্ঞান")) return nctbChapters["physics-9-10"] || nctbChapters.default;
    if (subjectName.includes("বিজ্ঞান")) return nctbChapters["primary-science"] || nctbChapters.default;
    if (subjectName.includes("বাংলাদেশ")) return nctbChapters["bangladesh-global-studies"] || nctbChapters.default;
    if (subjectName.includes("ইসলাম")) return nctbChapters["islam-studies"] || nctbChapters.default;
    if (subjectName.includes("তথ্য")) return nctbChapters["ict-6"] || nctbChapters.default;

    return nctbChapters.default;
};

export const nctbSubjects = {
    "প্রথম-শ্রেণী": ["আমার বাংলা বই", "English For Today", "প্রাথমিক গণিত"],
    "দ্বিতীয়-শ্রেণী": ["আমার বাংলা বই", "English For Today", "প্রাথমিক গণিত"],
    "তৃতীয়-শ্রেণী": ["আমার বাংলা বই", "English For Today", "প্রাথমিক গণিত", "প্রাথমিক বিজ্ঞান", "বাংলাদেশ ও বিশ্বপরিচয়", "ইসলাম শিক্ষা"],
    "চতুর্থ-শ্রেণী": ["আমার বাংলা বই", "English For Today", "প্রাথমিক গণিত", "প্রাথমিক বিজ্ঞান", "বাংলাদেশ ও বিশ্বপরিচয়", "ইসলাম শিক্ষা"],
    "পঞ্চম-শ্রেণী": ["আমার বাংলা বই", "English For Today", "প্রাথমিক গণিত", "প্রাথমিক বিজ্ঞান", "বাংলাদেশ ও বিশ্বপরিচয়", "ইসলাম শিক্ষা"],
    "ষষ্ঠ-শ্রেণী": ["চারুপাঠ", "আনন্দপাঠ", "বাংলা ব্যাকরণ ও নির্মিতি", "English For Today", "English Grammar & Composition", "গণিত", "বিজ্ঞান", "বাংলাদেশ ও বিশ্বপরিচয়", "তথ্য ও যোগাযোগ প্রযুক্তি", "ইসলাম শিক্ষা", "কৃষিশিক্ষা", "শারীরিক শিক্ষা ও স্বাস্থ্য", "কর্ম ও জীবনমুখী শিক্ষা"],
    "সপ্তম-শ্রেণী": ["সপ্তবর্ণা", "আনন্দপাঠ", "বাংলা ব্যাকরণ ও নির্মিতি", "English For Today", "English Grammar and Composition", "গণিত", "বিজ্ঞান", "বাংলাদেশ ও বিশ্বপরিচয়", "তথ্য ও যোগাযোগ প্রযুক্তি", "ইসলাম শিক্ষা", "কৃষিশিক্ষা", "শারীরিক শিক্ষা ও স্বাস্থ্য", "কর্ম ও জীবনমুখী শিক্ষা"],
    "অষ্টম-শ্রেণী": ["সাহিত্য কণিকা", "আনন্দপাঠ", "বাংলা ব্যাকরণ ও নির্মিতি", "বাংলা ব্যাকরণ ও নির্মিতি", "English For Today", "English Grammar and Composition", "গণিত", "বিজ্ঞান", "বাংলাদেশ ও বিশ্বপরিচয়", "তথ্য ও যোগাযোগ প্রযুক্তি", "ইসলাম শিক্ষা", "কৃষিশিক্ষা", "শারীরিক শিক্ষা ও স্বাস্থ্য", "কর্ম ও জীবনমুখী শিক্ষা"],
    "নবম-দশম শ্রেণি": ["গণিত", "পদার্থবিজ্ঞান", "উচ্চতর গণিত"], // 2026 Syllabus Focus
    "একাদশ-শ্রেণী": [
        "পদার্থবিজ্ঞান প্রথম পত্র", "পদার্থবিজ্ঞান দ্বিতীয় পত্র",
        "রসায়ন প্রথম পত্র", "রসায়ন দ্বিতীয় পত্র",
        "জীববিজ্ঞান প্রথম পত্র", "জীববিজ্ঞান দ্বিতীয় পত্র",
        "উচ্চতর গণিত প্রথম পত্র", "উচ্চতর গণিত দ্বিতীয় পত্র",
        "বাংলা প্রথম পত্র", "বাংলা দ্বিতীয় পত্র",
        "ইংরেজি প্রথম পত্র", "ইংরেজি দ্বিতীয় পত্র",
        "তথ্য ও যোগাযোগ প্রযুক্তি"
    ],
    "দ্বাদশ-শ্রেণী": [
        "পদার্থবিজ্ঞান প্রথম পত্র", "পদার্থবিজ্ঞান দ্বিতীয় পত্র",
        "রসায়ন প্রথম পত্র", "রসায়ন দ্বিতীয় পত্র",
        "জীববিজ্ঞান প্রথম পত্র", "জীববিজ্ঞান দ্বিতীয় পত্র",
        "উচ্চতর গণিত প্রথম পত্র", "উচ্চতর গণিত দ্বিতীয় পত্র",
        "বাংলা প্রথম পত্র", "বাংলা দ্বিতীয় পত্র",
        "ইংরেজি প্রথম পত্র", "ইংরেজি দ্বিতীয় পত্র",
        "তথ্য ও যোগাযোগ প্রযুক্তি"
    ]
};
