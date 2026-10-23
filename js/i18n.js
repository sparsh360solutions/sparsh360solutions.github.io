// UI text in English, Hindi and Gujarati.
// In the page: data-i18n="key" sets text, data-i18n-html sets markup (our own strings only),
// data-i18n-ph a placeholder, data-i18n-aria an aria-label; data-n fills {n}.
(() => {
  const WA = '<a href="https://wa.me/917043588033">+91 70435 88033</a>';
  const STR = {
    en: {
      step1: "Photo", step2: "Mark door", step3: "Choose design",
      heroTitle: "See your new door <em>on your own wall</em>",
      heroLead: "Photograph your wall, mark the door and try over 1,100 premium lamination designs in seconds. Free, no app needed.",
      takePhoto: "Take a photo", upload: "Upload from gallery",
      statDesigns: "door designs", statBrands: "leading brands", statFree: "Free", statNoApp: "no app to install",
      roomsLabel: "No photo handy? Try a sample room",
      room_living: "Living room", room_bedroom: "Bedroom", room_modern: "Modern hallway",
      howKicker: "How it works", howTitle: "Three steps to your perfect door",
      how1t: "Photograph your wall", how1p: "Stand straight in front of the doorway and keep the whole frame in the picture.",
      how2t: "Mark the door", how2p: "Drag the four gold dots onto the corners of your door. A magnifier helps you place them exactly.",
      how3t: "Choose & share", how3p: "Tap any design to see it on your wall, then send the picture to us on WhatsApp for price and availability.",
      brandsKicker: "The collection", brandsTitle: "Designs from India&rsquo;s trusted lamination brands",
      nDesigns: "{n} designs", oneDesign: "1 design",
      faqKicker: "Questions", faqTitle: "Lamination doors &amp; the Door Studio — FAQ",
      faq1q: "How can I see a lamination door design on my own wall?",
      faq1a: "Open the Sparsh 360 Door Studio, take or upload a photo of your wall, drag the four dots onto the corners of the door frame, then tap any design. The door is shown on your wall in the right perspective. It is free and works in your phone browser without any app.",
      faq2q: "How many lamination door designs does Sparsh 360 have?",
      faq2a: 'Over 1,100 lamination door designs from Aastha, Ramdev, Deluxe and Wonder Sign. Every design has a code, for example RD-114 or WL-DG-1026, that you can quote when you enquire. <a href="designs/">Browse all designs</a>.',
      faq3q: "What is a lamination door?",
      faq3a: "A lamination door is a door finished with a decorative laminate sheet printed with wood grains, patterns or artwork. Laminated doors are durable, easy to clean, resist moisture and scratches better than paint, and come in hundreds of designs at an affordable price.",
      faq4q: "What is the price of a lamination door?",
      faq4a: `The price depends on the design, door size and finish. Choose a design in the Door Studio and send it to Sparsh 360 on WhatsApp at ${WA} to get the exact price, sizes and delivery time.`,
      faq5q: "How do I order a door I like?",
      faq5a: "Tap Share on WhatsApp in the Door Studio to send the picture of the door on your wall with its design code, or tap Chat with us. The Sparsh 360 team will reply with price and availability, and you can also see it in our showroom in Vadodara.",
      faq6q: "Where can I buy lamination doors in Vadodara?",
      faq6a: `Sparsh 360 in Vadodara, Gujarat sells lamination doors, interiors and laminates, with over 1,100 door designs from Aastha, Ramdev, Deluxe and Wonder Sign. Try any design on your wall in the free Door Studio, then WhatsApp ${WA} for price and delivery.`,
      faq7q: "Do I need to install an app or sign up?",
      faq7a: "No. The Door Studio runs in any phone or laptop browser. Your photo stays on your device and is not uploaded anywhere.",
      showKicker: "Doors &middot; Interiors &middot; Laminates",
      showTitle: "Love a design? Come feel it in our showroom.",
      showText: "Every door you try here is available at Sparsh 360 in Vadodara. Share your favourite on WhatsApp and our team will reply with price, finish options and delivery.",
      showBtn: "Start with a photo",
      footAll: "All door designs",
      footCopy: "&copy; Sparsh 360&trade; &middot; Doors | Interiors | Laminates &middot; Vadodara, Gujarat",
      markEyebrow: "Step 2 of 3", markTitle: "Mark the door corners",
      markLead: "Drag the <b>4 numbered dots</b> onto the corners of the door frame.",
      cornerTL: "Top left", cornerTR: "Top right", cornerBR: "Bottom right", cornerBL: "Bottom left",
      markTip: "A magnifier appears while you drag. Drag inside the shape to move it all at once.",
      markCanvas: "Your photo — drag the four corner dots onto the door",
      changePhoto: "Change photo", reset: "Reset", nextDesign: "Next: choose design", chooseDesign: "Choose design",
      livePreview: "Live preview", loadingDesign: "Loading design…",
      adjust: 'Adjust<span class="tool-long"> corners</span>', light: "Light",
      save: 'Save<span class="tool-long"> picture</span>', compare: "Compare",
      yourSelection: "Your selection", pickDesign: "Pick a design",
      pickHint: "Tap any door in the collection to try it on your wall.",
      shareWa: "Share on WhatsApp", chat: 'Chat<span class="tool-long"> with us</span>',
      sendNote: 'Send the picture to <b id="waNumber"></b> — we\'ll reply with price &amp; availability.',
      collection: "Door collection", searchPh: "Search design code, e.g. RD-114", searchAria: "Search design code",
      clearSearch: "Clear search",
      all: "All", allOf: "All {brand}", saved: "Saved",
      look_light: "Light", look_medium: "Medium", look_dark: "Dark", look_grey: "White & grey", look_colour: "Colourful",
      lookGroup: "Colour", brandGroup: "Brand", catGroup: "Catalog",
      loading: "Loading…",
      noneFound: "No designs found", noMatch: "Nothing matches “{q}”. Check the code or try another brand.",
      noLook: "No designs in this colour here. Try another colour or brand.",
      emptyCat: "No designs in this catalog yet.",
      noSaved: "Nothing saved yet. Tap the ♥ on any design you like.",
      showAll: "Show all designs",
      loadFail: "Couldn't load designs. Please check your connection and refresh.",
      designFail: "Couldn't load this design. Please try another.",
      roomFail: "Couldn't open the sample room. Please try again.",
      pictureSaved: "Picture saved", attachInChat: "Picture saved — attach it in the WhatsApp chat",
      deepLink: "Design {code} selected — take a photo of your wall to try it",
      favAdd: "Save design", favRemove: "Remove from saved",
      favAdded: "Saved {code}", favRemoved: "Removed {code}",
      cmpTitle: "Compare on your wall", cmpSub: "Your saved designs, side by side.",
      cmpLatest: "Showing your 4 latest saved designs.",
      cmpNeed: "Tap ♥ on at least 2 designs to compare them.",
      cmpUse: "Try this", cmpRemove: "Remove", cmpShare: "Send all on WhatsApp", close: "Close",
      msgOne: "Hi {shop}! I like door design {code} ({cat}). Please share the price and details.",
      msgAny: "Hi {shop}! I'd like to know more about your lamination doors.",
      msgMany: "Hi {shop}! I've shortlisted these door designs:\n{list}\nPlease share the price and details.",
      sendTo: "(Send to {shop}: {wa})",
      langAria: "Language",
    },

    hi: {
      step1: "फ़ोटो", step2: "दरवाज़ा चिह्नित करें", step3: "डिज़ाइन चुनें",
      heroTitle: "अपनी दीवार पर <em>देखें अपना नया दरवाज़ा</em>",
      heroLead: "अपनी दीवार की फ़ोटो लें, दरवाज़ा चिह्नित करें और 1,100 से ज़्यादा प्रीमियम लेमिनेशन डिज़ाइन कुछ ही सेकंड में आज़माएँ। मुफ़्त, कोई ऐप नहीं चाहिए।",
      takePhoto: "फ़ोटो लें", upload: "गैलरी से चुनें",
      statDesigns: "डोर डिज़ाइन", statBrands: "प्रमुख ब्रांड", statFree: "मुफ़्त", statNoApp: "कोई ऐप नहीं",
      roomsLabel: "फ़ोटो नहीं है? सैंपल कमरे में आज़माएँ",
      room_living: "लिविंग रूम", room_bedroom: "बेडरूम", room_modern: "मॉडर्न हॉलवे",
      howKicker: "कैसे काम करता है", howTitle: "तीन आसान स्टेप में अपना परफ़ेक्ट दरवाज़ा",
      how1t: "दीवार की फ़ोटो लें", how1p: "दरवाज़े के ठीक सामने खड़े होकर पूरी चौखट फ़ोटो में लें।",
      how2t: "दरवाज़ा चिह्नित करें", how2p: "चार सुनहरे बिंदुओं को दरवाज़े के कोनों पर खींचें। मैग्निफ़ायर से उन्हें सही जगह लगाना आसान है।",
      how3t: "चुनें और भेजें", how3p: "कोई भी डिज़ाइन टैप करके अपनी दीवार पर देखें, फिर कीमत और उपलब्धता के लिए फ़ोटो हमें WhatsApp पर भेजें।",
      brandsKicker: "कलेक्शन", brandsTitle: "भारत के भरोसेमंद लेमिनेशन ब्रांड्स के डिज़ाइन",
      nDesigns: "{n} डिज़ाइन", oneDesign: "1 डिज़ाइन",
      faqKicker: "सवाल", faqTitle: "लेमिनेशन दरवाज़े और डोर स्टूडियो — अक्सर पूछे जाने वाले सवाल",
      faq1q: "मैं अपनी दीवार पर लेमिनेशन डोर डिज़ाइन कैसे देखूँ?",
      faq1a: "Sparsh 360 डोर स्टूडियो खोलें, अपनी दीवार की फ़ोटो लें या अपलोड करें, चारों बिंदुओं को दरवाज़े की चौखट के कोनों पर खींचें, फिर कोई भी डिज़ाइन टैप करें। दरवाज़ा सही पर्सपेक्टिव में आपकी दीवार पर दिखेगा। यह मुफ़्त है और बिना किसी ऐप के फ़ोन ब्राउज़र में चलता है।",
      faq2q: "Sparsh 360 के पास कितने लेमिनेशन डोर डिज़ाइन हैं?",
      faq2a: 'Aastha, Ramdev, Deluxe और Wonder Sign के 1,100 से ज़्यादा लेमिनेशन डोर डिज़ाइन। हर डिज़ाइन का एक कोड है, जैसे RD-114 या WL-DG-1026, जिसे आप पूछताछ के समय बता सकते हैं। <a href="designs/">सभी डिज़ाइन देखें</a>।',
      faq3q: "लेमिनेशन डोर क्या होता है?",
      faq3a: "लेमिनेशन डोर वह दरवाज़ा है जिस पर लकड़ी के रेशों, पैटर्न या आर्टवर्क वाली सजावटी लेमिनेट शीट लगी होती है। लेमिनेटेड दरवाज़े मज़बूत होते हैं, आसानी से साफ़ होते हैं, पेंट से बेहतर नमी और खरोंच झेलते हैं, और सैकड़ों डिज़ाइनों में किफ़ायती दाम पर मिलते हैं।",
      faq4q: "लेमिनेशन डोर की कीमत क्या है?",
      faq4a: `कीमत डिज़ाइन, दरवाज़े के साइज़ और फ़िनिश पर निर्भर करती है। डोर स्टूडियो में डिज़ाइन चुनें और सही कीमत, साइज़ और डिलीवरी समय के लिए उसे Sparsh 360 को WhatsApp ${WA} पर भेजें।`,
      faq5q: "पसंद का दरवाज़ा कैसे ऑर्डर करूँ?",
      faq5a: "डोर स्टूडियो में ‘WhatsApp पर भेजें’ टैप करें — आपकी दीवार पर लगे दरवाज़े की फ़ोटो डिज़ाइन कोड के साथ चली जाएगी — या ‘चैट करें’ टैप करें। Sparsh 360 की टीम कीमत और उपलब्धता बताएगी, और आप वडोदरा में हमारे शोरूम में आकर भी देख सकते हैं।",
      faq6q: "वडोदरा में लेमिनेशन डोर कहाँ से खरीदें?",
      faq6a: `वडोदरा, गुजरात में Sparsh 360 लेमिनेशन दरवाज़े, इंटीरियर और लेमिनेट बेचता है, जिसमें Aastha, Ramdev, Deluxe और Wonder Sign के 1,100 से ज़्यादा डोर डिज़ाइन हैं। मुफ़्त डोर स्टूडियो में कोई भी डिज़ाइन अपनी दीवार पर आज़माएँ, फिर कीमत और डिलीवरी के लिए ${WA} पर WhatsApp करें।`,
      faq7q: "क्या कोई ऐप इंस्टॉल करना या साइन अप करना ज़रूरी है?",
      faq7a: "नहीं। डोर स्टूडियो किसी भी फ़ोन या लैपटॉप ब्राउज़र में चलता है। आपकी फ़ोटो आपके डिवाइस पर ही रहती है और कहीं अपलोड नहीं होती।",
      showKicker: "दरवाज़े &middot; इंटीरियर &middot; लेमिनेट",
      showTitle: "कोई डिज़ाइन पसंद आया? हमारे शोरूम में आकर देखें।",
      showText: "यहाँ आज़माया हर दरवाज़ा वडोदरा में Sparsh 360 पर उपलब्ध है। अपनी पसंद WhatsApp पर भेजें, हमारी टीम कीमत, फ़िनिश के विकल्प और डिलीवरी की जानकारी देगी।",
      showBtn: "फ़ोटो से शुरू करें",
      footAll: "सभी डोर डिज़ाइन",
      footCopy: "&copy; Sparsh 360&trade; &middot; दरवाज़े | इंटीरियर | लेमिनेट &middot; वडोदरा, गुजरात",
      markEyebrow: "स्टेप 2 / 3", markTitle: "दरवाज़े के कोने चिह्नित करें",
      markLead: "<b>4 नंबर वाले बिंदुओं</b> को दरवाज़े की चौखट के कोनों पर खींचें।",
      cornerTL: "ऊपर बाएँ", cornerTR: "ऊपर दाएँ", cornerBR: "नीचे दाएँ", cornerBL: "नीचे बाएँ",
      markTip: "खींचते समय मैग्निफ़ायर दिखेगा। पूरा आकार एक साथ खिसकाने के लिए उसके अंदर से खींचें।",
      markCanvas: "आपकी फ़ोटो — चारों कोनों के बिंदु दरवाज़े पर खींचें",
      changePhoto: "फ़ोटो बदलें", reset: "रीसेट", nextDesign: "आगे: डिज़ाइन चुनें", chooseDesign: "डिज़ाइन चुनें",
      livePreview: "लाइव प्रीव्यू", loadingDesign: "डिज़ाइन लोड हो रहा है…",
      adjust: 'कोने<span class="tool-long"> ठीक करें</span>', light: "रोशनी",
      save: 'सेव<span class="tool-long"> करें</span>', compare: "तुलना",
      yourSelection: "आपकी पसंद", pickDesign: "डिज़ाइन चुनें",
      pickHint: "अपनी दीवार पर आज़माने के लिए कलेक्शन में कोई भी दरवाज़ा टैप करें।",
      shareWa: "WhatsApp पर भेजें", chat: 'चैट<span class="tool-long"> करें</span>',
      sendNote: 'फ़ोटो <b id="waNumber"></b> पर भेजें — हम कीमत और उपलब्धता बताएँगे।',
      collection: "डोर कलेक्शन", searchPh: "डिज़ाइन कोड खोजें, जैसे RD-114", searchAria: "डिज़ाइन कोड खोजें",
      clearSearch: "खोज साफ़ करें",
      all: "सभी", allOf: "सभी {brand}", saved: "सेव किए",
      look_light: "हल्का", look_medium: "मीडियम", look_dark: "गहरा", look_grey: "सफ़ेद और ग्रे", look_colour: "रंगीन",
      lookGroup: "रंग", brandGroup: "ब्रांड", catGroup: "कैटलॉग",
      loading: "लोड हो रहा है…",
      noneFound: "कोई डिज़ाइन नहीं मिला", noMatch: "“{q}” से कुछ नहीं मिला। कोड जाँचें या दूसरा ब्रांड आज़माएँ।",
      noLook: "यहाँ इस रंग का कोई डिज़ाइन नहीं है। दूसरा रंग या ब्रांड आज़माएँ।",
      emptyCat: "इस कैटलॉग में अभी कोई डिज़ाइन नहीं है।",
      noSaved: "अभी कुछ सेव नहीं किया। पसंद के डिज़ाइन पर ♥ टैप करें।",
      showAll: "सभी डिज़ाइन दिखाएँ",
      loadFail: "डिज़ाइन लोड नहीं हो सके। कनेक्शन जाँचें और पेज रिफ़्रेश करें।",
      designFail: "यह डिज़ाइन लोड नहीं हो सका। कृपया दूसरा आज़माएँ।",
      roomFail: "सैंपल कमरा नहीं खुल सका। कृपया फिर से कोशिश करें।",
      pictureSaved: "फ़ोटो सेव हो गई", attachInChat: "फ़ोटो सेव हो गई — इसे WhatsApp चैट में अटैच करें",
      deepLink: "डिज़ाइन {code} चुना गया — आज़माने के लिए अपनी दीवार की फ़ोटो लें",
      favAdd: "डिज़ाइन सेव करें", favRemove: "सेव से हटाएँ",
      favAdded: "{code} सेव किया", favRemoved: "{code} हटाया",
      cmpTitle: "अपनी दीवार पर तुलना करें", cmpSub: "आपके सेव किए डिज़ाइन, एक साथ।",
      cmpLatest: "आपके 4 सबसे नए सेव किए डिज़ाइन दिख रहे हैं।",
      cmpNeed: "तुलना के लिए कम से कम 2 डिज़ाइन पर ♥ टैप करें।",
      cmpUse: "इसे आज़माएँ", cmpRemove: "हटाएँ", cmpShare: "सभी WhatsApp पर भेजें", close: "बंद करें",
      msgOne: "नमस्ते {shop}! मुझे डोर डिज़ाइन {code} ({cat}) पसंद है। कृपया कीमत और जानकारी भेजें।",
      msgAny: "नमस्ते {shop}! मुझे आपके लेमिनेशन दरवाज़ों के बारे में जानना है।",
      msgMany: "नमस्ते {shop}! मैंने ये डोर डिज़ाइन पसंद किए हैं:\n{list}\nकृपया कीमत और जानकारी भेजें।",
      sendTo: "({shop} को भेजें: {wa})",
      langAria: "भाषा",
    },

    gu: {
      step1: "ફોટો", step2: "દરવાજો માર્ક કરો", step3: "ડિઝાઇન પસંદ કરો",
      heroTitle: "તમારી દીવાલ પર <em>જુઓ તમારો નવો દરવાજો</em>",
      heroLead: "તમારી દીવાલનો ફોટો લો, દરવાજો માર્ક કરો અને 1,100થી વધુ પ્રીમિયમ લેમિનેશન ડિઝાઇન થોડી સેકન્ડમાં અજમાવો. મફત, કોઈ એપની જરૂર નથી.",
      takePhoto: "ફોટો લો", upload: "ગેલેરીમાંથી પસંદ કરો",
      statDesigns: "ડોર ડિઝાઇન", statBrands: "જાણીતી બ્રાન્ડ", statFree: "મફત", statNoApp: "કોઈ એપ નહીં",
      roomsLabel: "ફોટો નથી? સેમ્પલ રૂમમાં અજમાવો",
      room_living: "લિવિંગ રૂમ", room_bedroom: "બેડરૂમ", room_modern: "મોડર્ન હૉલવે",
      howKicker: "કેવી રીતે કામ કરે છે", howTitle: "ત્રણ સરળ સ્ટેપમાં તમારો પરફેક્ટ દરવાજો",
      how1t: "દીવાલનો ફોટો લો", how1p: "દરવાજાની બરાબર સામે ઊભા રહીને આખી ફ્રેમ ફોટોમાં લો.",
      how2t: "દરવાજો માર્ક કરો", how2p: "ચાર સોનેરી ટપકાં દરવાજાના ખૂણા પર ખેંચો. મેગ્નિફાયરથી તેને ચોક્કસ જગ્યાએ મૂકવા સરળ છે.",
      how3t: "પસંદ કરો અને મોકલો", how3p: "કોઈ પણ ડિઝાઇન ટેપ કરીને તમારી દીવાલ પર જુઓ, પછી ભાવ અને ઉપલબ્ધતા માટે ફોટો અમને WhatsApp પર મોકલો.",
      brandsKicker: "કલેક્શન", brandsTitle: "ભારતની વિશ્વસનીય લેમિનેશન બ્રાન્ડ્સની ડિઝાઇન",
      nDesigns: "{n} ડિઝાઇન", oneDesign: "1 ડિઝાઇન",
      faqKicker: "પ્રશ્નો", faqTitle: "લેમિનેશન દરવાજા અને ડોર સ્ટુડિયો — વારંવાર પૂછાતા પ્રશ્નો",
      faq1q: "મારી દીવાલ પર લેમિનેશન ડોર ડિઝાઇન કેવી રીતે જોઉં?",
      faq1a: "Sparsh 360 ડોર સ્ટુડિયો ખોલો, તમારી દીવાલનો ફોટો લો અથવા અપલોડ કરો, ચારેય ટપકાં દરવાજાની ફ્રેમના ખૂણા પર ખેંચો, પછી કોઈ પણ ડિઝાઇન ટેપ કરો. દરવાજો યોગ્ય પર્સ્પેક્ટિવમાં તમારી દીવાલ પર દેખાશે. તે મફત છે અને કોઈ એપ વગર ફોનના બ્રાઉઝરમાં ચાલે છે.",
      faq2q: "Sparsh 360 પાસે કેટલી લેમિનેશન ડોર ડિઝાઇન છે?",
      faq2a: 'Aastha, Ramdev, Deluxe અને Wonder Signની 1,100થી વધુ લેમિનેશન ડોર ડિઝાઇન. દરેક ડિઝાઇનનો એક કોડ છે, જેમ કે RD-114 અથવા WL-DG-1026, જે તમે પૂછપરછ વખતે જણાવી શકો. <a href="designs/">બધી ડિઝાઇન જુઓ</a>.',
      faq3q: "લેમિનેશન ડોર એટલે શું?",
      faq3a: "લેમિનેશન ડોર એવો દરવાજો છે જેના પર લાકડાની ભાત, પેટર્ન અથવા આર્ટવર્કવાળી સુશોભિત લેમિનેટ શીટ લગાવેલી હોય છે. લેમિનેટેડ દરવાજા મજબૂત હોય છે, સહેલાઈથી સાફ થાય છે, પેઇન્ટ કરતાં ભેજ અને ઘસરકા સામે વધુ ટકે છે, અને સેંકડો ડિઝાઇનમાં વાજબી ભાવે મળે છે.",
      faq4q: "લેમિનેશન ડોરનો ભાવ શું છે?",
      faq4a: `ભાવ ડિઝાઇન, દરવાજાની સાઇઝ અને ફિનિશ પર આધાર રાખે છે. ડોર સ્ટુડિયોમાં ડિઝાઇન પસંદ કરો અને ચોક્કસ ભાવ, સાઇઝ અને ડિલિવરી સમય માટે તેને Sparsh 360ને WhatsApp ${WA} પર મોકલો.`,
      faq5q: "ગમતો દરવાજો કેવી રીતે ઓર્ડર કરું?",
      faq5a: "ડોર સ્ટુડિયોમાં ‘WhatsApp પર મોકલો’ ટેપ કરો — તમારી દીવાલ પરના દરવાજાનો ફોટો ડિઝાઇન કોડ સાથે જશે — અથવા ‘ચેટ કરો’ ટેપ કરો. Sparsh 360ની ટીમ ભાવ અને ઉપલબ્ધતા જણાવશે, અને તમે વડોદરામાં અમારા શોરૂમમાં આવીને પણ જોઈ શકો છો.",
      faq6q: "વડોદરામાં લેમિનેશન ડોર ક્યાંથી ખરીદવા?",
      faq6a: `વડોદરા, ગુજરાતમાં Sparsh 360 લેમિનેશન દરવાજા, ઇન્ટિરિયર અને લેમિનેટ વેચે છે, જેમાં Aastha, Ramdev, Deluxe અને Wonder Signની 1,100થી વધુ ડોર ડિઝાઇન છે. મફત ડોર સ્ટુડિયોમાં કોઈ પણ ડિઝાઇન તમારી દીવાલ પર અજમાવો, પછી ભાવ અને ડિલિવરી માટે ${WA} પર WhatsApp કરો.`,
      faq7q: "શું કોઈ એપ ઇન્સ્ટોલ કરવી કે સાઇન અપ કરવું જરૂરી છે?",
      faq7a: "ના. ડોર સ્ટુડિયો કોઈ પણ ફોન કે લેપટોપના બ્રાઉઝરમાં ચાલે છે. તમારો ફોટો તમારા ડિવાઇસ પર જ રહે છે અને ક્યાંય અપલોડ થતો નથી.",
      showKicker: "દરવાજા &middot; ઇન્ટિરિયર &middot; લેમિનેટ",
      showTitle: "ડિઝાઇન ગમી? અમારા શોરૂમમાં આવીને જુઓ.",
      showText: "અહીં અજમાવેલો દરેક દરવાજો વડોદરામાં Sparsh 360 પર ઉપલબ્ધ છે. તમારી પસંદ WhatsApp પર મોકલો, અમારી ટીમ ભાવ, ફિનિશના વિકલ્પો અને ડિલિવરીની માહિતી આપશે.",
      showBtn: "ફોટોથી શરૂ કરો",
      footAll: "બધી ડોર ડિઝાઇન",
      footCopy: "&copy; Sparsh 360&trade; &middot; દરવાજા | ઇન્ટિરિયર | લેમિનેટ &middot; વડોદરા, ગુજરાત",
      markEyebrow: "સ્ટેપ 2 / 3", markTitle: "દરવાજાના ખૂણા માર્ક કરો",
      markLead: "<b>4 નંબરવાળા ટપકાં</b> દરવાજાની ફ્રેમના ખૂણા પર ખેંચો.",
      cornerTL: "ઉપર ડાબે", cornerTR: "ઉપર જમણે", cornerBR: "નીચે જમણે", cornerBL: "નીચે ડાબે",
      markTip: "ખેંચતી વખતે મેગ્નિફાયર દેખાશે. આખો આકાર એકસાથે ખસેડવા તેની અંદરથી ખેંચો.",
      markCanvas: "તમારો ફોટો — ચારેય ખૂણાનાં ટપકાં દરવાજા પર ખેંચો",
      changePhoto: "ફોટો બદલો", reset: "રીસેટ", nextDesign: "આગળ: ડિઝાઇન પસંદ કરો", chooseDesign: "ડિઝાઇન પસંદ કરો",
      livePreview: "લાઇવ પ્રીવ્યૂ", loadingDesign: "ડિઝાઇન લોડ થાય છે…",
      adjust: 'ખૂણા<span class="tool-long"> સુધારો</span>', light: "પ્રકાશ",
      save: 'સેવ<span class="tool-long"> કરો</span>', compare: "સરખાવો",
      yourSelection: "તમારી પસંદ", pickDesign: "ડિઝાઇન પસંદ કરો",
      pickHint: "તમારી દીવાલ પર અજમાવવા કલેક્શનમાં કોઈ પણ દરવાજો ટેપ કરો.",
      shareWa: "WhatsApp પર મોકલો", chat: 'ચેટ<span class="tool-long"> કરો</span>',
      sendNote: 'ફોટો <b id="waNumber"></b> પર મોકલો — અમે ભાવ અને ઉપલબ્ધતા જણાવીશું.',
      collection: "ડોર કલેક્શન", searchPh: "ડિઝાઇન કોડ શોધો, જેમ કે RD-114", searchAria: "ડિઝાઇન કોડ શોધો",
      clearSearch: "શોધ સાફ કરો",
      all: "બધી", allOf: "બધી {brand}", saved: "સેવ કરેલી",
      look_light: "આછો", look_medium: "મીડિયમ", look_dark: "ઘેરો", look_grey: "સફેદ અને ગ્રે", look_colour: "રંગીન",
      lookGroup: "રંગ", brandGroup: "બ્રાન્ડ", catGroup: "કેટલોગ",
      loading: "લોડ થાય છે…",
      noneFound: "કોઈ ડિઝાઇન મળી નહીં", noMatch: "“{q}” સાથે કંઈ મળ્યું નહીં. કોડ તપાસો અથવા બીજી બ્રાન્ડ અજમાવો.",
      noLook: "અહીં આ રંગની કોઈ ડિઝાઇન નથી. બીજો રંગ અથવા બ્રાન્ડ અજમાવો.",
      emptyCat: "આ કેટલોગમાં હજી કોઈ ડિઝાઇન નથી.",
      noSaved: "હજી કંઈ સેવ કર્યું નથી. ગમતી ડિઝાઇન પર ♥ ટેપ કરો.",
      showAll: "બધી ડિઝાઇન બતાવો",
      loadFail: "ડિઝાઇન લોડ થઈ શકી નહીં. કનેક્શન તપાસો અને પેજ રિફ્રેશ કરો.",
      designFail: "આ ડિઝાઇન લોડ થઈ શકી નહીં. કૃપા કરીને બીજી અજમાવો.",
      roomFail: "સેમ્પલ રૂમ ખૂલી શક્યો નહીં. કૃપા કરીને ફરી પ્રયત્ન કરો.",
      pictureSaved: "ફોટો સેવ થયો", attachInChat: "ફોટો સેવ થયો — તેને WhatsApp ચેટમાં અટૅચ કરો",
      deepLink: "ડિઝાઇન {code} પસંદ થઈ — અજમાવવા તમારી દીવાલનો ફોટો લો",
      favAdd: "ડિઝાઇન સેવ કરો", favRemove: "સેવમાંથી કાઢો",
      favAdded: "{code} સેવ થઈ", favRemoved: "{code} કાઢી",
      cmpTitle: "તમારી દીવાલ પર સરખાવો", cmpSub: "તમારી સેવ કરેલી ડિઝાઇન, એકસાથે.",
      cmpLatest: "તમારી 4 સૌથી નવી સેવ કરેલી ડિઝાઇન દેખાય છે.",
      cmpNeed: "સરખાવવા માટે ઓછામાં ઓછી 2 ડિઝાઇન પર ♥ ટેપ કરો.",
      cmpUse: "આ અજમાવો", cmpRemove: "કાઢો", cmpShare: "બધી WhatsApp પર મોકલો", close: "બંધ કરો",
      msgOne: "નમસ્તે {shop}! મને ડોર ડિઝાઇન {code} ({cat}) ગમી છે. કૃપા કરીને ભાવ અને વિગતો મોકલો.",
      msgAny: "નમસ્તે {shop}! મારે તમારા લેમિનેશન દરવાજા વિશે જાણવું છે.",
      msgMany: "નમસ્તે {shop}! મેં આ ડોર ડિઝાઇન પસંદ કરી છે:\n{list}\nકૃપા કરીને ભાવ અને વિગતો મોકલો.",
      sendTo: "({shop}ને મોકલો: {wa})",
      langAria: "ભાષા",
    },
  };

  const KEY = "sparsh-lang";
  const HTML_LANG = { en: "en-IN", hi: "hi", gu: "gu" };
  let lang = "";
  try { lang = localStorage.getItem(KEY) || ""; } catch {}
  if (!STR[lang]) {
    const nav = (navigator.language || "").toLowerCase();
    lang = nav.startsWith("hi") ? "hi" : nav.startsWith("gu") ? "gu" : "en";
  }
  const listeners = [];

  function t(key, vars) {
    let s = STR[lang][key] ?? STR.en[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return s;
  }

  function apply(root = document) {
    root.querySelectorAll("[data-i18n]").forEach(el => {
      el.textContent = t(el.dataset.i18n, el.dataset.n ? { n: el.dataset.n } : null);
    });
    root.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    root.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    root.querySelectorAll("[data-i18n-aria]").forEach(el => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    document.querySelectorAll("[data-lang]").forEach(b => {
      const on = b.dataset.lang === lang;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on);
    });
    document.documentElement.lang = HTML_LANG[lang];
  }

  function set(l) {
    if (!STR[l] || l === lang) return;
    lang = l;
    try { localStorage.setItem(KEY, l); } catch {}
    apply();
    listeners.forEach(f => f());
  }

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-lang]");
    if (b) set(b.dataset.lang);
  });

  window.I18N = { t, set, apply, onChange: f => listeners.push(f), get lang() { return lang; } };
  // English is already in the HTML; only rewrite the page for Hindi/Gujarati.
  if (lang !== "en") apply(); else document.querySelectorAll("[data-lang='en']").forEach(b => { b.classList.add("on"); b.setAttribute("aria-pressed", true); });
})();
