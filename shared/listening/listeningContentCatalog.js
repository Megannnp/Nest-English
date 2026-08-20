// Single source of truth for the listening module's static content catalog.
// Imported by both the client (offline/guest fallback) and the server
// (`/listening/content` fallback), so the two never drift apart.

export const LISTENING_MINIMAL_PAIRS = [
  { pair: ["ship", "sheep"], hint: "/ɪ/ vs /iː/", tip: "元音短长之别" },
  { pair: ["cat", "cut"], hint: "/æ/ vs /ʌ/", tip: "前元音 vs 中元音" },
  { pair: ["bed", "bad"], hint: "/e/ vs /æ/", tip: "舌位高低之别" },
  { pair: ["think", "sink"], hint: "/θ/ vs /s/", tip: "齿间音 vs 齿龈音" },
  { pair: ["right", "light"], hint: "/r/ vs /l/", tip: "英语 r/l 辨音" },
  { pair: ["pull", "pool"], hint: "/ʊ/ vs /uː/", tip: "短 u vs 长 u" },
  { pair: ["win", "vine"], hint: "/w/ vs /v/", tip: "唇音辨别" },
  { pair: ["bear", "beer"], hint: "/eə/ vs /ɪə/", tip: "双元音辨别" },
  { pair: ["bit", "beat"], hint: "/ɪ/ vs /iː/", tip: "元音短长" },
  { pair: ["set", "sat"], hint: "/e/ vs /æ/", tip: "前元音对比" },
  { pair: ["hat", "hot"], hint: "/æ/ vs /ɒ/", tip: "前 vs 后元音" },
  { pair: ["fun", "fan"], hint: "/ʌ/ vs /æ/", tip: "中元音 vs 前元音" },
  { pair: ["live", "leave"], hint: "/ɪ/ vs /iː/", tip: "常见易混词对" },
  { pair: ["full", "fool"], hint: "/ʊ/ vs /uː/", tip: "圆唇元音" },
  { pair: ["cot", "coat"], hint: "/ɒ/ vs /əʊ/", tip: "单元音 vs 双元音" },
  { pair: ["man", "men"], hint: "/æ/ vs /e/", tip: "复数形式辨音" },
  { pair: ["came", "come"], hint: "/eɪ/ vs /ʌ/", tip: "双元音 vs 短元音" },
  { pair: ["three", "free"], hint: "/θ/ vs /f/", tip: "齿间音 vs 唇齿音" },
  { pair: ["hurt", "hut"], hint: "/ɜː/ vs /ʌ/", tip: "中央元音辨别" },
  { pair: ["this", "these"], hint: "/ɪ/ vs /iː/", tip: "代词辨音" },
];

export const LISTENING_WORD_ITEMS = [
  { word: "environment", ipa: "/ɪnˈvaɪrənmənt/", hint: "5 音节", audioUrl: "" },
  { word: "comfortable", ipa: "/ˈkʌmftəbəl/", hint: "3 音节", audioUrl: "" },
  { word: "pronunciation", ipa: "/prəˌnʌnsiˈeɪʃən/", hint: "5 音节", audioUrl: "" },
  { word: "particularly", ipa: "/pəˈtɪkjələli/", hint: "5 音节", audioUrl: "" },
  { word: "extraordinary", ipa: "/ɪkˈstrɔːrdəneri/", hint: "5 音节", audioUrl: "" },
  { word: "characteristic", ipa: "/ˌkærəktəˈrɪstɪk/", hint: "5 音节", audioUrl: "" },
  { word: "temperature", ipa: "/ˈtemprətʃər/", hint: "3 音节", audioUrl: "" },
  { word: "vocabulary", ipa: "/vəˈkæbjʊleri/", hint: "4 音节", audioUrl: "" },
  { word: "considerable", ipa: "/kənˈsɪdərəbəl/", hint: "4 音节", audioUrl: "" },
  { word: "approximately", ipa: "/əˈprɒksɪmətli/", hint: "5 音节", audioUrl: "" },
  { word: "responsibility", ipa: "/rɪˌspɒnsəˈbɪləti/", hint: "6 音节", audioUrl: "" },
  { word: "opportunity", ipa: "/ˌɒpəˈtjuːnəti/", hint: "5 音节", audioUrl: "" },
  { word: "communication", ipa: "/kəˌmjuːnɪˈkeɪʃən/", hint: "5 音节", audioUrl: "" },
  { word: "independent", ipa: "/ˌɪndɪˈpendənt/", hint: "4 音节", audioUrl: "" },
  { word: "organization", ipa: "/ˌɔːrɡənɪˈzeɪʃən/", hint: "5 音节", audioUrl: "" },
  { word: "development", ipa: "/dɪˈveləpmənt/", hint: "4 音节", audioUrl: "" },
  { word: "international", ipa: "/ˌɪntəˈnæʃənəl/", hint: "5 音节", audioUrl: "" },
  { word: "government", ipa: "/ˈɡʌvənmənt/", hint: "3 音节", audioUrl: "" },
  { word: "celebration", ipa: "/ˌseləˈbreɪʃən/", hint: "4 音节", audioUrl: "" },
  { word: "technology", ipa: "/tekˈnɒlədʒi/", hint: "4 音节", audioUrl: "" },
  { word: "occasionally", ipa: "/əˈkeɪʒənəli/", hint: "5 音节", audioUrl: "" },
  { word: "examination", ipa: "/ɪɡˌzæmɪˈneɪʃən/", hint: "5 音节", audioUrl: "" },
  { word: "imagination", ipa: "/ɪˌmædʒɪˈneɪʃən/", hint: "5 音节", audioUrl: "" },
  { word: "understanding", ipa: "/ˌʌndəˈstændɪŋ/", hint: "4 音节", audioUrl: "" },
  { word: "performance", ipa: "/pəˈfɔːrməns/", hint: "3 音节", audioUrl: "" },
  { word: "population", ipa: "/ˌpɒpjʊˈleɪʃən/", hint: "4 音节", audioUrl: "" },
  { word: "significance", ipa: "/sɪɡˈnɪfɪkəns/", hint: "4 音节", audioUrl: "" },
  { word: "accommodation", ipa: "/əˌkɒməˈdeɪʃən/", hint: "5 音节", audioUrl: "" },
  { word: "automatically", ipa: "/ˌɔːtəˈmætɪkli/", hint: "5 音节", audioUrl: "" },
  { word: "unfortunately", ipa: "/ʌnˈfɔːtʃənətli/", hint: "5 音节", audioUrl: "" },
  { word: "satisfaction", ipa: "/ˌsætɪsˈfækʃən/", hint: "4 音节", audioUrl: "" },
  { word: "circumstances", ipa: "/ˈsɜːkəmstænsɪz/", hint: "4 音节", audioUrl: "" },
  { word: "qualification", ipa: "/ˌkwɒlɪfɪˈkeɪʃən/", hint: "5 音节", audioUrl: "" },
  { word: "determination", ipa: "/dɪˌtɜːmɪˈneɪʃən/", hint: "5 音节", audioUrl: "" },
  { word: "achievement", ipa: "/əˈtʃiːvmənt/", hint: "3 音节", audioUrl: "" },
  { word: "investigation", ipa: "/ɪnˌvestɪˈɡeɪʃən/", hint: "5 音节", audioUrl: "" },
  { word: "environmental", ipa: "/ɪnˌvaɪrənˈmentəl/", hint: "5 音节", audioUrl: "" },
  { word: "representative", ipa: "/ˌreprɪˈzentətɪv/", hint: "5 音节", audioUrl: "" },
  { word: "simultaneously", ipa: "/ˌsɪməlˈteɪniəsli/", hint: "6 音节", audioUrl: "" },
  { word: "establishment", ipa: "/ɪˈstæblɪʃmənt/", hint: "4 音节", audioUrl: "" },
];

export const LISTENING_SENTENCE_ITEMS = [
  { text: "The students are studying in the library after school.", level: "初级" },
  { text: "He wakes up early every morning to go jogging in the park.", level: "初级" },
  { text: "The museum will be closed for renovation until the end of next month.", level: "初级" },
  { text: "She practices piano for two hours every day because she enjoys it.", level: "初级" },
  { text: "They decided to take a walk along the river before dinner.", level: "初级" },
  { text: "She couldn't decide whether to accept the new job offer.", level: "中级" },
  { text: "Scientists have recently discovered a new species of deep-sea fish.", level: "中级" },
  { text: "Many people believe that learning a second language improves brain function.", level: "中级" },
  { text: "The company has invested heavily in renewable energy over the past decade.", level: "中级" },
  { text: "Volunteers collected more than five hundred bags of litter from the beach.", level: "中级" },
  { text: "The train was delayed due to severe weather conditions in the northern regions.", level: "中级" },
  { text: "The government announced ambitious new policies to address climate change.", level: "高级" },
  { text: "Despite the challenges, the team managed to complete the project on time.", level: "高级" },
  { text: "Advances in artificial intelligence are transforming how we approach medical diagnosis.", level: "高级" },
  { text: "The negotiators finally reached an agreement after three days of intense discussions.", level: "高级" },
];

export const LISTENING_PASSAGES = [
  {
    id: "p1",
    title: "The Importance of Reading",
    level: "初中",
    audioUrl: "",
    sentenceAudioUrls: [],
    sentences: [
      "Reading is one of the best habits a person can develop.",
      "It helps you learn new things and expand your vocabulary.",
      "Try to read for at least thirty minutes every day.",
      "You will be surprised by how much you can improve.",
      "Books open doors to worlds you have never seen before.",
    ],
  },
  {
    id: "p2",
    title: "Healthy Eating Habits",
    level: "初中",
    audioUrl: "",
    sentenceAudioUrls: [],
    sentences: [
      "Eating a balanced diet is important for staying healthy and energetic.",
      "Doctors recommend eating plenty of fruits and vegetables every day.",
      "Processed foods often contain too much sugar, salt, and unhealthy fats.",
      "Drinking enough water is just as important as eating the right foods.",
      "Making small changes to your diet can lead to big improvements in how you feel.",
    ],
  },
  {
    id: "p3",
    title: "Climate Change",
    level: "高中",
    audioUrl: "",
    sentenceAudioUrls: [],
    sentences: [
      "Climate change is one of the most serious challenges facing our planet today.",
      "Rising temperatures are causing sea levels to rise and extreme weather to become more frequent.",
      "Scientists agree that we must significantly reduce carbon emissions to limit global warming.",
      "Both governments and individuals have an important role to play in addressing this crisis.",
      "Renewable energy sources such as solar and wind power offer promising solutions for the future.",
    ],
  },
  {
    id: "p4",
    title: "Artificial Intelligence",
    level: "四六级",
    audioUrl: "",
    sentenceAudioUrls: [],
    sentences: [
      "Artificial intelligence is transforming almost every aspect of modern life.",
      "From healthcare to education, AI systems are being used to analyze data and make predictions.",
      "However, there are growing concerns about job displacement and the ethics of automated decision-making.",
      "Researchers are working to develop AI that is transparent, fair, and accountable to human oversight.",
      "The key challenge is ensuring that the benefits of AI are shared broadly across society.",
    ],
  },
  {
    id: "p5",
    title: "Space Exploration",
    level: "四六级",
    audioUrl: "",
    sentenceAudioUrls: [],
    sentences: [
      "Space exploration has been one of humanity's greatest scientific achievements.",
      "The launch of the first satellite in 1957 marked the beginning of a new era.",
      "Since then, humans have landed on the Moon and sent probes to every planet in our solar system.",
      "Private companies are now competing to build spacecraft capable of carrying tourists to space.",
      "Many scientists believe that establishing colonies on Mars will be essential for the long-term survival of our species.",
    ],
  },
];

export const LISTENING_SCENARIOS_BY_STAGE = {
  初中: [
    {
      id: "j1", stage: "初中", topic: "校园生活", audioUrl: "", dictationAudioUrl: "",
      audio: "Tom cannot find his homework. He thinks he left it at home. His teacher tells him to hand it in tomorrow and be more careful next time. Tom promises to check his bag every evening before going to bed.",
      questions: [
        { stem: "What problem does Tom have?", opts: ["He lost his textbook.", "He forgot his homework.", "He is late for class.", "He broke his pen."], answer: 1 },
        { stem: "Where does Tom think his homework is?", opts: ["In his desk", "In the library", "At home", "On the playground"], answer: 2 },
        { stem: "What does the teacher ask Tom to do?", opts: ["Call his parents", "Hand it in tomorrow", "Find it right now", "Ask a classmate for help"], answer: 1 },
      ],
      dictation: "Tom forgot his homework at home.",
    },
    {
      id: "j2", stage: "初中", topic: "家庭活动", audioUrl: "", dictationAudioUrl: "",
      audio: "Lucy and her family are planning a picnic for this Saturday. Her mother will make sandwiches and fruit salad. Her father will bring a football. Lucy hopes the weather will be sunny so they can stay in the park all afternoon.",
      questions: [
        { stem: "When is the picnic planned?", opts: ["Friday evening", "This Saturday", "Next Sunday", "This Sunday"], answer: 1 },
        { stem: "What will Lucy's mother prepare?", opts: ["Pizza and juice", "Sandwiches and fruit salad", "Noodles and soup", "Cookies and cake"], answer: 1 },
        { stem: "What does Lucy hope for?", opts: ["A cool breeze", "Sunny weather", "A short picnic", "More friends to join"], answer: 1 },
      ],
      dictation: "Lucy's family will have a picnic on Saturday.",
    },
    {
      id: "j3", stage: "初中", topic: "购物经历", audioUrl: "", dictationAudioUrl: "",
      audio: "Mary went to the shopping centre on Sunday to buy a birthday present for her friend. She looked at books, toys, and sports equipment before choosing a set of coloured pencils. The shop assistant helped her wrap the gift in beautiful paper.",
      questions: [
        { stem: "Why did Mary go to the shopping centre?", opts: ["To buy clothes for herself", "To buy a birthday present", "To meet her friend", "To return a book"], answer: 1 },
        { stem: "What did Mary finally choose?", opts: ["A toy", "A book", "A sports bag", "A set of coloured pencils"], answer: 3 },
        { stem: "What did the shop assistant help her do?", opts: ["Find the exit", "Wrap the gift", "Pay the bill", "Choose a colour"], answer: 1 },
      ],
      dictation: "Mary bought a set of coloured pencils as a birthday gift.",
    },
  ],
  高中: [
    {
      id: "h1", stage: "高中", topic: "环境保护", audioUrl: "", dictationAudioUrl: "",
      audio: "A recent study shows that air pollution in cities is getting worse. Researchers found that cars and factories are the main causes. Local governments are encouraged to promote public transportation and invest in clean energy. Individuals can also help by cycling or switching to electric vehicles.",
      questions: [
        { stem: "What is the study mainly about?", opts: ["Water pollution", "Noise pollution", "Air pollution", "Soil pollution"], answer: 2 },
        { stem: "What are the main causes according to the study?", opts: ["Trees and plants", "Cars and factories", "Schools and hospitals", "Parks and rivers"], answer: 1 },
        { stem: "What can individuals do to help?", opts: ["Plant more trees", "Cycle or use electric vehicles", "Open windows more often", "Buy fewer products"], answer: 1 },
      ],
      dictation: "Air pollution in cities is getting worse.",
    },
    {
      id: "h2", stage: "高中", topic: "网络学习", audioUrl: "", dictationAudioUrl: "",
      audio: "Online learning has grown rapidly over the past few years. Many students now take courses from universities around the world without leaving home. However, researchers warn that online learners need strong self-discipline to stay on track. Interaction with teachers and classmates remains an important part of effective education.",
      questions: [
        { stem: "What has grown rapidly in recent years?", opts: ["Online shopping", "Online learning", "Online gaming", "Online banking"], answer: 1 },
        { stem: "What do researchers say online learners need?", opts: ["Better computers", "Strong self-discipline", "More free time", "A quiet library"], answer: 1 },
        { stem: "What is still important for effective education?", opts: ["Expensive equipment", "Short lessons", "Interaction with teachers and classmates", "Reading printed books"], answer: 2 },
      ],
      dictation: "Online learners need strong self-discipline to succeed.",
    },
    {
      id: "h3", stage: "高中", topic: "职业规划", audioUrl: "", dictationAudioUrl: "",
      audio: "Choosing a career is one of the most important decisions a young person can make. Experts suggest exploring your interests and strengths before deciding on a path. It is also useful to talk to professionals working in fields that interest you. Remember that many people change careers several times during their lives, so it is never too late to try something new.",
      questions: [
        { stem: "What do experts suggest doing first?", opts: ["Finding a job immediately", "Exploring your interests and strengths", "Asking your parents to decide", "Choosing the highest-paying job"], answer: 1 },
        { stem: "What is a useful step mentioned?", opts: ["Studying abroad", "Talking to professionals in your area of interest", "Avoiding difficult subjects", "Starting your own business"], answer: 1 },
        { stem: "What does the passage say about changing careers?", opts: ["It is impossible after thirty", "It shows a lack of focus", "Many people change careers several times", "It should be avoided"], answer: 2 },
      ],
      dictation: "Many people change careers several times during their lives.",
    },
  ],
  四六级: [
    {
      id: "c1", stage: "四六级", topic: "科技发展", audioUrl: "", dictationAudioUrl: "",
      audio: "Researchers at Stanford University have developed a new battery technology that can charge smartphones in under five minutes. The battery uses a new type of electrode made from silicon rather than graphite. Scientists say the technology could also be applied to electric vehicles, potentially cutting charging time from hours to minutes.",
      questions: [
        { stem: "What has been developed at Stanford University?", opts: ["A new smartphone", "A faster cable", "A new battery technology", "A solar panel system"], answer: 2 },
        { stem: "What material is used in the new electrode?", opts: ["Graphite", "Carbon fiber", "Silicon", "Lithium"], answer: 2 },
        { stem: "How could this technology benefit electric vehicles?", opts: ["Reduce their weight", "Lower their cost", "Increase their maximum speed", "Reduce their charging time"], answer: 3 },
      ],
      dictation: "The new battery can charge a smartphone in under five minutes.",
    },
    {
      id: "c2", stage: "四六级", topic: "心理健康", audioUrl: "", dictationAudioUrl: "",
      audio: "Mental health has become a growing concern among young adults worldwide. Studies show that one in four university students experiences significant levels of anxiety or depression. Researchers point to academic pressure, social media use, and financial stress as contributing factors. Universities are responding by expanding counseling services and promoting awareness campaigns.",
      questions: [
        { stem: "What does the study show about university students?", opts: ["One in two struggles with sleep", "One in four has significant anxiety or depression", "Most students feel satisfied", "Three in four seek counseling"], answer: 1 },
        { stem: "Which factor is NOT mentioned as a cause?", opts: ["Academic pressure", "Social media use", "Physical illness", "Financial stress"], answer: 2 },
        { stem: "How are universities responding?", opts: ["By reducing homework", "By closing social media access", "By expanding counseling services", "By shortening degree programs"], answer: 2 },
      ],
      dictation: "One in four university students experiences significant anxiety or depression.",
    },
    {
      id: "c3", stage: "四六级", topic: "生物多样性", audioUrl: "", dictationAudioUrl: "",
      audio: "Biodiversity loss is accelerating at an unprecedented rate, with scientists estimating that species are disappearing a thousand times faster than natural extinction rates. Habitat destruction, pollution, and climate change are the primary drivers. Conservation efforts, such as protected areas and wildlife corridors, have shown some success, but experts warn that far more ambitious action is needed at the global scale.",
      questions: [
        { stem: "How much faster are species disappearing compared to natural rates?", opts: ["Ten times", "One hundred times", "A thousand times", "A million times"], answer: 2 },
        { stem: "Which is NOT listed as a primary driver of biodiversity loss?", opts: ["Habitat destruction", "Pollution", "Overpopulation", "Climate change"], answer: 2 },
        { stem: "What is the experts' warning?", opts: ["Current efforts are sufficient", "More ambitious global action is needed", "Protected areas should be reduced", "Wildlife corridors are ineffective"], answer: 1 },
      ],
      dictation: "Species are disappearing a thousand times faster than natural extinction rates.",
    },
  ],
};

export function buildListeningStaticCatalog() {
  return {
    minimalPairs: LISTENING_MINIMAL_PAIRS,
    wordItems: LISTENING_WORD_ITEMS,
    sentenceItems: LISTENING_SENTENCE_ITEMS,
    passages: LISTENING_PASSAGES,
    scenariosByStage: LISTENING_SCENARIOS_BY_STAGE,
  };
}
