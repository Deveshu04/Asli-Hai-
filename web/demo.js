(function () {
  const FIXED = {
    welcomeParent: "नमस्ते {{parent_name}} जी, मैं साथी, असली है से बोल रही हूँ। अभी आपको किसने कॉल किया था, और वो क्या माँग रहे थे?",
    welcomeCheck: "नमस्ते {{child_name}}, मैं साथी, असली है से बोल रही हूँ, {{parent_name}} जी की सुरक्षा लाइन। अभी उन्हें एक कॉल आया जिसमें किसी ने {{claimed_name}} बनकर पैसे माँगे। क्या आपने अभी उन्हें कॉल किया था?",
    preCall: "मैं अभी आपके परिवार को कॉल कर रही हूँ। लाइन पर बने रहिए।",
    verdictFake: "अच्छी ख़बर। मैंने आपके परिवार से बात कर ली है। वो बिल्कुल ठीक हैं और उन्होंने आपको कोई कॉल नहीं किया। वो कॉल नकली था। कोई पैसा या OTP मत दीजिए, और उस नंबर को ब्लॉक कर दीजिए।",
    verdictUnconfirmed: "अभी मैं आपके परिवार से पक्की बात नहीं कर पाई। जब तक आप ख़ुद उनसे उनके पुराने नंबर पर बात न कर लें, कोई पैसा मत भेजिए। असली मुसीबत होगी तो वो थोड़ा इंतज़ार कर सकती है।",
    authorityScam: "ध्यान से सुनिए। डिजिटल अरेस्ट नाम की कोई चीज़ क़ानून में नहीं है। पुलिस, CBI या कोर्ट वीडियो कॉल पर पैसे नहीं माँगते। अभी वो कॉल काट दीजिए, और कोई OTP या पैसा मत दीजिए। मैं आपके परिवार को बता रही हूँ।",
    alreadyPaid: "घबराइए मत, पर अभी तुरंत 1930 पर कॉल कीजिए, शुरू के घंटे सबसे ज़रूरी होते हैं। फिर अपने बैंक को भी कॉल कीजिए। मैं आपके परिवार को अभी ख़बर कर रही हूँ।",
    closing: "अपना ध्यान रखिए। जब भी शक हो, यही बटन दबाइए। नमस्ते।",
    thanks: "शुक्रिया। मैं उन्हें अभी बता रही हूँ। नमस्ते।",
  };

  const fill = (text, vars) => text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key]);

  const WHO = {
    saathi: { en: "Saathi", hi: "साथी", side: "agent" },
    check: { en: "Asli hai? check", hi: "असली है? जाँच", side: "agent" },
    sunita: { en: "Sunita", hi: "सुनीता", side: "person" },
    rahul: { en: "Rahul", hi: "राहुल", side: "person" },
  };

  const STATES = {
    idle: { en: "Idle", hi: "ख़ाली" },
    on: { en: "On call", hi: "कॉल पर" },
    ended: { en: "Call ended", hi: "कॉल ख़त्म" },
    rahulRinging: { en: "Ringing Rahul", hi: "राहुल को घंटी" },
    rahulOn: { en: "On call with Rahul", hi: "राहुल से बात" },
    rahulMissed: { en: "Rahul didn't answer", hi: "राहुल ने नहीं उठाया" },
    priyaRinging: { en: "Ringing Priya", hi: "प्रिया को घंटी" },
    priyaMissed: { en: "Priya didn't answer", hi: "प्रिया ने नहीं उठाया" },
    alerted: { en: "WhatsApp alert sent", hi: "WhatsApp पर ख़बर" },
  };

  const opening = [
    { t: 0, phone: "parent", event: { en: "Sunita presses the yellow button", hi: "सुनीता पीला बटन दबाती हैं" } },
    { t: 5, phone: "parent", state: "on", event: { en: "Saathi calls Sunita back", hi: "साथी सुनीता को वापस कॉल करती है" } },
    { t: 7, phone: "parent", who: "saathi", fixed: true, hi: fill(FIXED.welcomeParent, { parent_name: "सुनीता" }),
      en: "Namaste Sunita ji, I'm Saathi, speaking from Asli hai. Who called you just now, and what were they asking for?" },
  ];

  const callFamily = (claimed, claimedEn) => [
    { t: 22, phone: "parent", who: "saathi", fixed: true, hi: FIXED.preCall, en: "I'm calling your family right now. Please stay on the line." },
    { t: 23, phone: "family", state: "rahulRinging", event: { en: "Rahul's phone rings", hi: "राहुल का फ़ोन बजता है" } },
    { t: 30, phone: "family", state: "rahulOn", who: "check", fixed: true,
      hi: fill(FIXED.welcomeCheck, { child_name: "राहुल", parent_name: "सुनीता", claimed_name: claimed }),
      en: `Namaste Rahul, I'm Saathi, speaking from Asli hai, Sunita ji's safety line. Someone just called her pretending to be ${claimedEn} and asked for money. Did you just call her?` },
    { t: 32, phone: "parent", who: "saathi", hi: "घबराइए मत, मैं आपके साथ हूँ। उस नंबर का फ़ोन मत उठाइए, और उसे वापस कॉल मत कीजिए।",
      en: "Don't worry, I'm with you. Don't answer that number, and don't call it back." },
  ];

  const SCENARIOS = {
    fake: [
      ...opening,
      { t: 15, phone: "parent", who: "sunita", hi: "मेरे बेटे का फ़ोन आया था। बोला एक्सीडेंट हो गया है, पचास हज़ार तुरंत भेजो।",
        en: "My son called. He said he'd had an accident and needs fifty thousand right away." },
      ...callFamily("बेटा", "her son"),
      { t: 41, phone: "family", who: "rahul", hi: "नहीं, मैंने कोई कॉल नहीं किया। मैं तो ऑफ़िस में हूँ।", en: "No, I didn't call her. I'm at the office." },
      { t: 43, phone: "family", state: "ended", who: "check", fixed: true, hi: FIXED.thanks, en: "Thank you. I'm telling her now. Goodbye." },
      { t: 44, phone: "parent", event: { en: "Backend fires child_safe into Sunita's call", hi: "child_safe फ़ैसला सुनीता के कॉल में पहुँचता है" } },
      { t: 44, phone: "parent", who: "saathi", fixed: true, tone: "safe", hi: FIXED.verdictFake,
        en: "Good news. I've spoken to your family. They're fine and they didn't call you. That call was fake. Don't give any money or OTP, and block that number.",
        verdict: { en: "Fake call. Don't pay.", hi: "कॉल नकली था। पैसे मत भेजिए।", tone: "safe" } },
      { t: 52, phone: "family", state: "alerted", event: { en: "Rahul gets a WhatsApp summary", hi: "राहुल को WhatsApp पर सारांश मिलता है" } },
    ],
    real: [
      ...opening,
      { t: 15, phone: "parent", who: "sunita", hi: "राहुल का नए नंबर से फ़ोन आया था। बोला फ़ोन खो गया है, कैब के लिए दो हज़ार चाहिए।",
        en: "Rahul called from a new number. He said he lost his phone and needs two thousand for a cab." },
      ...callFamily("राहुल", "Rahul"),
      { t: 40, phone: "family", who: "rahul", hi: "हाँ, मैंने ही कॉल किया था। मेरा फ़ोन खो गया है।", en: "Yes, that was me. I lost my phone." },
      { t: 43, phone: "family", who: "check", hi: "ठीक है। पक्का करने के लिए अपना परिवार का शब्द बोलिए।", en: "All right. To confirm it's you, please say your family word." },
      { t: 47, phone: "family", who: "rahul", hi: "(परिवार का शब्द)", en: "(says the family word; only the server compares it)" },
      { t: 49, phone: "family", state: "ended", who: "check", fixed: true, hi: FIXED.thanks, en: "Thank you. I'm telling her now. Goodbye." },
      { t: 50, phone: "parent", event: { en: "The word matches. child_confirmed fires into Sunita's call", hi: "शब्द मिल गया। child_confirmed सुनीता के कॉल में पहुँचता है" } },
      { t: 51, phone: "parent", who: "saathi", tone: "safe",
        hi: "राहुल ने ख़ुद बताया कि कॉल उन्हीं का था, और परिवार का शब्द सही बोला। ये कॉल असली है। पैसे सिर्फ़ उसी खाते में भेजिए जो राहुल आपको ख़ुद बताएँ, और पहले उन्हें उनके पुराने नंबर पर कॉल कर लीजिए।",
        en: "Rahul confirmed the call himself and gave the right family word. This call is genuine. Send money only to an account Rahul gives you directly, and call him back on his saved number first.",
        verdict: { en: "Genuine. Rahul confirmed it.", hi: "असली। राहुल ने पक्का किया।", tone: "safe" } },
    ],
    cbi: [
      ...opening,
      { t: 15, phone: "parent", who: "sunita", hi: "कोई CBI से बोल रहा था। कह रहा था मेरे नाम पर केस है, वीडियो कॉल पर रहो और पैसे भेजो।",
        en: "Someone said he was from the CBI. He said there's a case in my name, to stay on the video call and send money." },
      { t: 21, phone: "parent", who: "saathi", fixed: true, tone: "warn", hi: FIXED.authorityScam,
        en: "Listen carefully. There is no such thing as a 'digital arrest' in law. Police, the CBI and courts don't ask for money on video calls. Hang up that call now, and don't give any OTP or money. I'm telling your family.",
        verdict: { en: "Scam. Told to hang up.", hi: "ठगी। कॉल काटने को कहा।", tone: "warn" } },
      { t: 24, phone: "family", state: "alerted", event: { en: "Rahul gets a WhatsApp alert", hi: "राहुल को WhatsApp पर ख़बर मिलती है" } },
      { t: 36, phone: "parent", who: "sunita", hi: "अच्छा, मैं वो कॉल काट देती हूँ।", en: "All right, I'll hang up on them." },
      { t: 39, phone: "parent", who: "saathi", hi: "बिल्कुल सही। उस नंबर को ब्लॉक भी कर दीजिए।", en: "Exactly right. Block that number too." },
      { t: 44, phone: "parent", who: "sunita", hi: "ठीक है, धन्यवाद।", en: "Okay, thank you." },
      { t: 46, phone: "parent", state: "ended", who: "saathi", fixed: true, hi: FIXED.closing,
        en: "Take care. Whenever you're unsure, press this same button. Namaste." },
    ],
    paid: [
      ...opening,
      { t: 15, phone: "parent", who: "sunita", hi: "मैंने उन्हें दस हज़ार भेज दिए, और OTP भी बता दिया।", en: "I already sent them ten thousand, and told them the OTP too." },
      { t: 20, phone: "parent", who: "saathi", fixed: true, tone: "warn", hi: FIXED.alreadyPaid,
        en: "Don't panic, but call 1930 right now; the first hours matter most. Then call your bank too. I'm letting your family know right now.",
        verdict: { en: "Money sent. Call 1930 now.", hi: "पैसे गए। अभी 1930 पर कॉल।", tone: "warn" } },
      { t: 23, phone: "family", state: "alerted", event: { en: "Rahul gets a WhatsApp alert to call his mother", hi: "राहुल को माँ को कॉल करने की ख़बर मिलती है" } },
      { t: 34, phone: "parent", who: "sunita", hi: "ठीक है, मैं अभी 1930 पर कॉल करती हूँ।", en: "Okay, I'll call 1930 right now." },
      { t: 37, phone: "parent", state: "ended", who: "saathi", fixed: true, hi: FIXED.closing,
        en: "Take care. Whenever you're unsure, press this same button. Namaste." },
    ],
    noanswer: [
      ...opening,
      { t: 15, phone: "parent", who: "sunita", hi: "मेरे बेटे का फ़ोन आया था। बोला एक्सीडेंट हो गया है, पचास हज़ार तुरंत भेजो।",
        en: "My son called. He said he'd had an accident and needs fifty thousand right away." },
      { t: 22, phone: "parent", who: "saathi", fixed: true, hi: FIXED.preCall, en: "I'm calling your family right now. Please stay on the line." },
      { t: 23, phone: "family", state: "rahulRinging", event: { en: "Rahul's phone rings", hi: "राहुल का फ़ोन बजता है" } },
      { t: 37, phone: "parent", who: "saathi", hi: "मैं आपके बेटे को कॉल कर रही हूँ, बस थोड़ी देर। उस नंबर का फ़ोन मत उठाइए।",
        en: "I'm calling your son, just a little longer. Don't answer that number." },
      { t: 50, phone: "family", state: "rahulMissed", event: { en: "No answer. The backend tries the next contact", hi: "जवाब नहीं। अगले व्यक्ति को कॉल" } },
      { t: 51, phone: "family", state: "priyaRinging", event: { en: "Priya's phone rings", hi: "प्रिया का फ़ोन बजता है" } },
      { t: 52, phone: "parent", who: "saathi", hi: "मैं घर के दूसरे सदस्य को भी कॉल कर रही हूँ। आप लाइन पर बने रहिए।",
        en: "I'm calling another family member too. Please stay on the line." },
      { t: 80, phone: "family", state: "priyaMissed", event: { en: "No answer from Priya either", hi: "प्रिया ने भी नहीं उठाया" } },
      { t: 97, phone: "parent", event: { en: "75 seconds without an answer. not_confirmed fires", hi: "75 सेकंड में जवाब नहीं। not_confirmed पहुँचता है" } },
      { t: 97, phone: "parent", who: "saathi", fixed: true, tone: "warn", hi: FIXED.verdictUnconfirmed,
        en: "I couldn't confirm with your family just now. Don't send any money until you've spoken to them yourself on their old number. A real emergency can wait a little.",
        verdict: { en: "Not confirmed. Don't pay yet.", hi: "पक्का नहीं। अभी पैसे मत भेजिए।", tone: "warn" } },
    ],
  };

  const VOICES = [
    {
      "code": "hi",
      "native": "हिंदी",
      "en": "Hindi",
      "hi": "हिंदी",
      "voice": "Aparna, Sarvam bulbul:v4-flash",
      "line": "अच्छी ख़बर। मैंने आपके परिवार से बात कर ली है। वो बिल्कुल ठीक हैं और उन्होंने आपको कोई कॉल नहीं किया। वो कॉल नकली था। कोई पैसा या OTP मत दीजिए, और उस नंबर को ब्लॉक कर दीजिए।"
    },
    {
      "code": "en",
      "native": "English",
      "en": "English",
      "hi": "अंग्रेज़ी",
      "voice": "Aparna, Sarvam bulbul:v4-flash",
      "line": "Good news. I've spoken to your family. They are completely fine, and they did not call you. That call was fake. Don't give any money or OTP, and block that number."
    },
    {
      "code": "bn",
      "native": "বাংলা",
      "en": "Bengali",
      "hi": "बांग्ला",
      "voice": "Roopa, Sarvam bulbul:v4-flash",
      "line": "ভালো খবর। আমি আপনার পরিবারের সঙ্গে কথা বলেছি। ওনারা একদম ভালো আছেন, আর ওনারা আপনাকে কোনো ফোন করেননি। ওই ফোনটা ভুয়ো ছিল। কোনো টাকা বা OTP দেবেন না, আর ওই নম্বরটা ব্লক করে দিন।"
    },
    {
      "code": "mr",
      "native": "मराठी",
      "en": "Marathi",
      "hi": "मराठी",
      "voice": "Ishita, Sarvam bulbul:v4-flash",
      "line": "चांगली बातमी. मी तुमच्या कुटुंबाशी बोलले आहे. ते अगदी ठीक आहेत आणि त्यांनी तुम्हाला कोणताही फोन केला नाही. तो फोन खोटा होता. कोणतेही पैसे किंवा OTP देऊ नका, आणि तो नंबर ब्लॉक करा."
    },
    {
      "code": "te",
      "native": "తెలుగు",
      "en": "Telugu",
      "hi": "तेलुगु",
      "voice": "Kavitha, Sarvam bulbul:v4-flash",
      "line": "శుభవార్త. నేను మీ కుటుంబంతో మాట్లాడాను. వారు పూర్తిగా క్షేమంగా ఉన్నారు, వారు మీకు ఎలాంటి ఫోన్ చేయలేదు. ఆ ఫోన్ నకిలీది. ఎలాంటి డబ్బు గానీ OTP గానీ ఇవ్వకండి, ఆ నంబర్‌ను బ్లాక్ చేయండి."
    },
    {
      "code": "ta",
      "native": "தமிழ்",
      "en": "Tamil",
      "hi": "तमिल",
      "voice": "Kavya, Sarvam bulbul:v3",
      "line": "நல்ல செய்தி. நான் உங்கள் குடும்பத்தினரிடம் பேசினேன். அவர்கள் நலமாக இருக்கிறார்கள், அவர்கள் உங்களுக்கு எந்த அழைப்பும் செய்யவில்லை. அந்த அழைப்பு போலியானது. எந்தப் பணமும் OTP-யும் கொடுக்காதீர்கள், அந்த எண்ணை பிளாக் செய்யுங்கள்."
    },
    {
      "code": "gu",
      "native": "ગુજરાતી",
      "en": "Gujarati",
      "hi": "गुजराती",
      "voice": "Pooja, Sarvam bulbul:v4-flash",
      "line": "સારા સમાચાર. મેં તમારા પરિવાર સાથે વાત કરી લીધી છે. તેઓ બિલકુલ ઠીક છે અને તેમણે તમને કોઈ ફોન કર્યો નથી. તે ફોન નકલી હતો. કોઈ પૈસા કે OTP ન આપશો, અને તે નંબર બ્લોક કરી દો."
    },
    {
      "code": "kn",
      "native": "ಕನ್ನಡ",
      "en": "Kannada",
      "hi": "कन्नड़",
      "voice": "Chaitra, Sarvam bulbul:v4-flash",
      "line": "ಒಳ್ಳೆಯ ಸುದ್ದಿ. ನಾನು ನಿಮ್ಮ ಕುಟುಂಬದವರೊಂದಿಗೆ ಮಾತನಾಡಿದ್ದೇನೆ. ಅವರು ಸಂಪೂರ್ಣವಾಗಿ ಚೆನ್ನಾಗಿದ್ದಾರೆ, ಮತ್ತು ಅವರು ನಿಮಗೆ ಯಾವುದೇ ಕರೆ ಮಾಡಿಲ್ಲ. ಆ ಕರೆ ನಕಲಿ ಆಗಿತ್ತು. ಯಾವುದೇ ಹಣ ಅಥವಾ OTP ಕೊಡಬೇಡಿ, ಮತ್ತು ಆ ನಂಬರ್ ಅನ್ನು ಬ್ಲಾಕ್ ಮಾಡಿ."
    },
    {
      "code": "ml",
      "native": "മലയാളം",
      "en": "Malayalam",
      "hi": "मलयालम",
      "voice": "Kavya, Sarvam bulbul:v3",
      "line": "നല്ല വാർത്ത. ഞാൻ നിങ്ങളുടെ കുടുംബവുമായി സംസാരിച്ചു. അവർ പൂർണ്ണമായും സുഖമായിരിക്കുന്നു, അവർ നിങ്ങളെ വിളിച്ചിട്ടില്ല. ആ കോൾ വ്യാജമായിരുന്നു. പണമോ OTP-യോ ഒന്നും കൊടുക്കരുത്, ആ നമ്പർ ബ്ലോക്ക് ചെയ്യുക."
    },
    {
      "code": "pa",
      "native": "ਪੰਜਾਬੀ",
      "en": "Punjabi",
      "hi": "पंजाबी",
      "voice": "Kavya, Sarvam bulbul:v3",
      "line": "ਚੰਗੀ ਖ਼ਬਰ। ਮੈਂ ਤੁਹਾਡੇ ਪਰਿਵਾਰ ਨਾਲ ਗੱਲ ਕਰ ਲਈ ਹੈ। ਉਹ ਬਿਲਕੁਲ ਠੀਕ ਹਨ ਅਤੇ ਉਨ੍ਹਾਂ ਨੇ ਤੁਹਾਨੂੰ ਕੋਈ ਫ਼ੋਨ ਨਹੀਂ ਕੀਤਾ। ਉਹ ਫ਼ੋਨ ਨਕਲੀ ਸੀ। ਕੋਈ ਪੈਸਾ ਜਾਂ OTP ਨਾ ਦਿਓ, ਅਤੇ ਉਸ ਨੰਬਰ ਨੂੰ ਬਲੌਕ ਕਰ ਦਿਓ।"
    },
    {
      "code": "od",
      "native": "ଓଡ଼ିଆ",
      "en": "Odia",
      "hi": "ओड़िया",
      "voice": "Kavya, Sarvam bulbul:v3",
      "line": "ଭଲ ଖବର। ମୁଁ ଆପଣଙ୍କ ପରିବାର ସହ କଥା ହୋଇସାରିଛି। ସେମାନେ ସମ୍ପୂର୍ଣ୍ଣ ଭଲରେ ଅଛନ୍ତି, ଆଉ ସେମାନେ ଆପଣଙ୍କୁ କୌଣସି ଫୋନ କରିନାହାନ୍ତି। ସେହି ଫୋନଟି ନକଲି ଥିଲା। କୌଣସି ଟଙ୍କା କିମ୍ବା OTP ଦିଅନ୍ତୁ ନାହିଁ, ଆଉ ସେହି ନମ୍ବରକୁ ବ୍ଲକ କରିଦିଅନ୍ତୁ।"
    },
    {
      "code": "as",
      "native": "অসমীয়া",
      "en": "Assamese",
      "hi": "असमिया",
      "voice": "Kavya, Sarvam bulbul:v3",
      "line": "ভাল খবৰ। মই আপোনাৰ পৰিয়ালৰ সৈতে কথা পাতিলোঁ। তেওঁলোক সম্পূৰ্ণ ভালে আছে, আৰু তেওঁলোকে আপোনাক কোনো ফোন কৰা নাই। সেই ফোনটো ভুৱা আছিল। কোনো টকা বা OTP নিদিব, আৰু সেই নম্বৰটো ব্লক কৰি দিয়ক।"
    }
  ];

  const choice = document.getElementById("lang-choice");
  if (choice) {
    const say = document.getElementById("lang-line");
    const voice = document.getElementById("lang-voice");
    choice.innerHTML = VOICES.map((v) => `<option value="${v.code}" lang="${v.code === "od" ? "or" : v.code}">${v.native}${v.code === "en" ? "" : " (" + v.en + ")"}</option>`).join("");
    const paintVoice = () => {
      const v = VOICES.find((x) => x.code === choice.value);
      say.lang = v.code === "od" ? "or" : v.code;
      say.textContent = v.line;
      voice.textContent = window.asli.pick({ en: "Voice: ", hi: "आवाज़: " }) + v.voice;
    };
    choice.addEventListener("change", paintVoice);
    window.asli.onLang(paintVoice);
    paintVoice();
  }

  const SPEED = 3;
  const sim = document.getElementById("sim");
  if (!sim) return;
  const screens = { parent: document.getElementById("parent-log"), family: document.getElementById("family-log") };
  const stateEls = { parent: document.getElementById("parent-state"), family: document.getElementById("family-state") };
  const clock = document.getElementById("sim-seconds");
  const verdictEl = document.getElementById("sim-verdict");
  const playBtn = document.getElementById("sim-play");
  const stepBtn = document.getElementById("sim-step");

  let steps = [];
  let next = 0;
  let simTime = 0;
  let running = false;
  let lastTick = 0;
  let timer = null;
  let frame = null;
  let states = {};
  let verdict = null;

  const pick = (copy) => window.asli.pick(copy);

  function pair(copy, tag = "span") {
    return `<${tag} class="t" lang="en">${copy.en}</${tag}><${tag} class="t" lang="hi">${copy.hi}</${tag}>`;
  }

  function render(step) {
    const line = document.createElement("div");
    if (step.event) {
      line.className = "line event";
      line.innerHTML = pair(step.event);
    } else {
      const who = WHO[step.who];
      line.className = `line ${who.side}${step.fixed ? " fixed" : ""}${step.tone ? " verdict-" + step.tone : ""}`;
      const badge = step.fixed ? `<span class="badge">${pair({ en: "Fixed", hi: "तय संदेश" })}</span>` : "";
      line.innerHTML = `<span class="who">${pair(who)}${badge}</span>` +
        `<span class="bubble"><span class="hi" lang="hi">${step.hi}</span><span class="en" lang="en">${step.en}</span></span>`;
    }
    const screen = screens[step.phone];
    screen.appendChild(line);
    screen.scrollTop = screen.scrollHeight;
    if (step.state) {
      states[step.phone] = step.state;
      paintStates();
    }
    if (step.verdict) {
      verdict = step.verdict;
      paintVerdict();
    }
  }

  function paintStates() {
    for (const phone of ["parent", "family"]) stateEls[phone].textContent = pick(STATES[states[phone] || "idle"]);
  }

  function paintVerdict() {
    verdictEl.className = "verdict" + (verdict ? " " + verdict.tone : "");
    verdictEl.textContent = verdict ? pick(verdict) : "";
  }

  function paintClock() {
    clock.textContent = String(Math.floor(simTime));
  }

  function paintButtons() {
    const done = next >= steps.length;
    playBtn.textContent = pick(running ? { en: "Pause", hi: "रोकिए" } : done ? { en: "Play again", hi: "फिर से चलाइए" } : { en: "Play", hi: "चलाइए" });
    stepBtn.disabled = done;
  }

  function reset() {
    stop();
    steps = SCENARIOS[sim.querySelector("input[name=scenario]:checked").value].slice().sort((a, b) => a.t - b.t);
    next = 0;
    simTime = 0;
    states = {};
    verdict = null;
    screens.parent.innerHTML = "";
    screens.family.innerHTML = "";
    paintStates();
    paintVerdict();
    paintClock();
    paintButtons();
  }

  function stop() {
    running = false;
    clearTimeout(timer);
    cancelAnimationFrame(frame);
  }

  function schedule() {
    clearTimeout(timer);
    if (!running) return;
    if (next >= steps.length) {
      stop();
      paintButtons();
      return;
    }
    const wait = Math.max(0, (steps[next].t - simTime) * 1000 / SPEED);
    timer = setTimeout(() => {
      simTime = Math.max(simTime, steps[next].t);
      render(steps[next++]);
      paintClock();
      schedule();
    }, wait);
  }

  function tick(now) {
    if (!running) return;
    simTime = Math.min(simTime + (now - lastTick) / 1000 * SPEED, steps[next] ? steps[next].t : simTime);
    lastTick = now;
    paintClock();
    frame = requestAnimationFrame(tick);
  }

  function play() {
    if (next >= steps.length) reset();
    running = true;
    lastTick = performance.now();
    frame = requestAnimationFrame(tick);
    schedule();
    paintButtons();
  }

  playBtn.addEventListener("click", () => {
    if (running) {
      stop();
      paintButtons();
    } else {
      play();
    }
  });

  stepBtn.addEventListener("click", () => {
    stop();
    if (next < steps.length) {
      simTime = steps[next].t;
      render(steps[next++]);
      paintClock();
    }
    paintButtons();
  });

  sim.addEventListener("change", (event) => {
    if (event.target.name !== "scenario") return;
    const wasRunning = running;
    reset();
    if (wasRunning) play();
  });

  window.asli.onLang(() => {
    paintStates();
    paintVerdict();
    paintButtons();
  });

  reset();
})();
