import type { IndustryDetail, VoiceOption, LanguageOption, LLMOption, Variable } from '../types/voiceAgent.types';

export const industryDetails: Record<string, IndustryDetail> = {
  EDUCATION: {
    icon: '🎓',
    color: '#3B82F6',
    gradient: 'from-blue-500 to-blue-600',
    description: 'Universities, colleges, coaching centers',
  },
  IT_RECRUITMENT: {
    icon: '💼',
    color: '#8B5CF6',
    gradient: 'from-purple-500 to-purple-600',
    description: 'Tech hiring, candidate screening',
  },
  REAL_ESTATE: {
    icon: '🏠',
    color: '#10B981',
    gradient: 'from-emerald-500 to-emerald-600',
    description: 'Property listings, site visits',
  },
  CUSTOMER_CARE: {
    icon: '📞',
    color: '#F59E0B',
    gradient: 'from-amber-500 to-amber-600',
    description: 'Support tickets, complaint handling',
  },
  TECHNICAL_INTERVIEW: {
    icon: '💻',
    color: '#EF4444',
    gradient: 'from-red-500 to-red-600',
    description: 'Coding interviews, skill evaluation',
  },
  HEALTHCARE: {
    icon: '🏥',
    color: '#06B6D4',
    gradient: 'from-cyan-500 to-cyan-600',
    description: 'Appointment booking, health queries',
  },
  FINANCE: {
    icon: '💰',
    color: '#84CC16',
    gradient: 'from-lime-500 to-lime-600',
    description: 'Loans, insurance, investments',
  },
  ECOMMERCE: {
    icon: '🛒',
    color: '#EC4899',
    gradient: 'from-pink-500 to-pink-600',
    description: 'Product queries, order tracking',
  },
  CUSTOM: {
    icon: '⚙️',
    color: '#6B7280',
    gradient: 'from-gray-500 to-gray-600',
    description: 'Build from scratch',
  },
};

export const voiceOptions: VoiceOption[] = [
  // Premium Voices
  { id: 'elevenlabs-21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm, warm - American', region: 'elevenlabs', gender: 'female', recommended: true, provider: 'elevenlabs', language: 'en-US', premium: true, testText: 'Hello! I am Rachel, your AI assistant. How can I help you today?' },
  { id: 'elevenlabs-EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Soft, young - American', region: 'elevenlabs', gender: 'female', provider: 'elevenlabs', language: 'en-US', premium: true },
  { id: 'elevenlabs-XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Elegant - British', region: 'elevenlabs', gender: 'female', provider: 'elevenlabs', language: 'en-GB', premium: true },
  { id: 'elevenlabs-ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', description: 'Pleasant - British', region: 'elevenlabs', gender: 'female', provider: 'elevenlabs', language: 'en-GB', premium: true },
  { id: 'elevenlabs-pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep narrator - American', region: 'elevenlabs', gender: 'male', recommended: true, provider: 'elevenlabs', language: 'en-US', premium: true, testText: 'Hello! I am Adam, your AI assistant. How may I assist you?' },
  { id: 'elevenlabs-TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Young, dynamic - American', region: 'elevenlabs', gender: 'male', provider: 'elevenlabs', language: 'en-US', premium: true },
  { id: 'elevenlabs-onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Authoritative - British', region: 'elevenlabs', gender: 'male', provider: 'elevenlabs', language: 'en-GB', premium: true },
  { id: 'elevenlabs-IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Casual - Australian', region: 'elevenlabs', gender: 'male', provider: 'elevenlabs', language: 'en-AU', premium: true },
  { id: 'elevenlabs-ZQe5CZNOzWyzPSCn5a3c', name: 'James', description: 'Calm, mature - Australian', region: 'elevenlabs', gender: 'male', provider: 'elevenlabs', language: 'en-AU', premium: true },
  { id: 'elevenlabs-GBv7mTt0atIp3Br8iCZE', name: 'Thomas', description: 'Calm, meditation - American', region: 'elevenlabs', gender: 'male', provider: 'elevenlabs', language: 'en-US', premium: true },
  { id: 'elevenlabs-Yko7PKHZNXotIFUBG7I9', name: 'Matthew', description: 'Audiobook narrator - British', region: 'elevenlabs', gender: 'male', provider: 'elevenlabs', language: 'en-GB', premium: true },
  // Custom Cloned Voices
  { id: 'elevenlabs_qf2cb4kpdw9Zfp2UNLcR', name: 'My Custom Voice', description: 'Custom Cloned Voice', region: 'custom', gender: 'male', recommended: true, provider: 'elevenlabs', language: 'te-IN', testText: 'Namaskaram! Nenu mee AI sahaayakudini.' },
  // Sarvam AI Voices (Indian Languages)
  // Hindi Voices
  { id: 'sarvam-priya', name: 'Priya', description: 'Hindi - Warm & Professional', region: 'sarvam', gender: 'female', recommended: true, provider: 'sarvam', language: 'hi-IN', testText: 'Namaste! Main aapki AI sahaayak hoon. Aaj main aapki kaise madad kar sakti hoon?' },
  { id: 'sarvam-dev', name: 'Dev', description: 'Hindi - Friendly & Clear', region: 'sarvam', gender: 'male', recommended: true, provider: 'sarvam', language: 'hi-IN', testText: 'Namaste! Main aapka AI sahaayak hoon. Aaj main aapki kaise madad kar sakta hoon?' },
  { id: 'sarvam-aarti', name: 'Aarti', description: 'Hindi - Soft & Gentle', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'hi-IN', testText: 'Namaste! Main Aarti hoon. Aapki seva mein hazir hoon.' },
  { id: 'sarvam-amit', name: 'Amit', description: 'Hindi - Professional & Confident', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'hi-IN', testText: 'Namaste! Main Amit hoon. Aapki kya madad kar sakta hoon?' },
  { id: 'sarvam-pooja', name: 'Pooja', description: 'Hindi - Young & Energetic', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'hi-IN', testText: 'Namaste! Main Pooja hoon. Batayein main aapki kaise help karun?' },
  { id: 'sarvam-rohit', name: 'Rohit', description: 'Hindi - Calm & Reassuring', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'hi-IN', testText: 'Namaste! Main Rohit hoon. Aaj main aapke liye kya kar sakta hoon?' },
  // Telugu Voices
  { id: 'sarvam-kavya', name: 'Kavya', description: 'Telugu - Warm & Friendly', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'te-IN', testText: 'Namaskaram! Nenu mee AI sahaayakuraalini. Ee roju mee ki ela sahaayam cheyagalanu?' },
  { id: 'sarvam-ravi', name: 'Ravi', description: 'Telugu - Professional & Clear', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'te-IN', testText: 'Namaskaram! Nenu mee AI sahaayakudini. Ee roju mee ki ela sahaayam cheyagalanu?' },
  { id: 'sarvam-lavanya', name: 'Lavanya', description: 'Telugu - Soft & Pleasant', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'te-IN', testText: 'Namaskaram! Nenu Lavanya. Meeku ela sahaayam cheyagalanu?' },
  { id: 'sarvam-suresh', name: 'Suresh', description: 'Telugu - Confident & Authoritative', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'te-IN', testText: 'Namaskaram! Nenu Suresh. Mee seva lo unnanu.' },
  // Tamil Voices
  { id: 'sarvam-neha', name: 'Neha', description: 'Tamil - Warm & Professional', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'ta-IN', testText: 'Vanakkam! Naan ungal AI udhaviyaalar. Inru ungalukku eppadi udhavi seiya mudiyum?' },
  { id: 'sarvam-karthik', name: 'Karthik', description: 'Tamil - Clear & Friendly', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'ta-IN', testText: 'Vanakkam! Naan Karthik. Ungalukku eppadi udhavi seiya mudiyum?' },
  { id: 'sarvam-divya', name: 'Divya', description: 'Tamil - Soft & Gentle', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'ta-IN', testText: 'Vanakkam! Naan Divya. Sollunga, enna udhavi vendum?' },
  { id: 'sarvam-vijay', name: 'Vijay', description: 'Tamil - Professional & Confident', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'ta-IN', testText: 'Vanakkam! Naan Vijay. Ungal sevayil irukiren.' },
  // Kannada Voices
  { id: 'sarvam-aditya', name: 'Aditya', description: 'Kannada - Professional & Clear', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'kn-IN', testText: 'Namaskara! Naanu nimma AI sahaayaka. Ivattu nimge hege sahaaya maadaballe?' },
  { id: 'sarvam-anjali', name: 'Anjali', description: 'Kannada - Warm & Friendly', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'kn-IN', testText: 'Namaskara! Naanu nimma AI sahaayaki. Ivattu nimge hege sahaaya maadaballe?' },
  { id: 'sarvam-deepa', name: 'Deepa', description: 'Kannada - Soft & Pleasant', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'kn-IN', testText: 'Namaskara! Naanu Deepa. Nimge hege sahaaya maadali?' },
  { id: 'sarvam-prasad', name: 'Prasad', description: 'Kannada - Confident & Authoritative', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'kn-IN', testText: 'Namaskara! Naanu Prasad. Nimma seveyalliiddene.' },
  // Malayalam Voices
  { id: 'sarvam-rahul', name: 'Rahul', description: 'Malayalam - Friendly & Clear', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'ml-IN', testText: 'Namaskkaram! Njan ningalude AI sahayi aanu. Innu ninakku njan engane sahaayikkum?' },
  { id: 'sarvam-lakshmi', name: 'Lakshmi', description: 'Malayalam - Warm & Professional', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'ml-IN', testText: 'Namaskkaram! Njan Lakshmi. Ningalkku engane sahayikkaam?' },
  { id: 'sarvam-anand', name: 'Anand', description: 'Malayalam - Professional & Confident', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'ml-IN', testText: 'Namaskkaram! Njan Anand. Ningalude sevayil aanu.' },
  { id: 'sarvam-sreeja', name: 'Sreeja', description: 'Malayalam - Soft & Gentle', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'ml-IN', testText: 'Namaskkaram! Njan Sreeja. Parayoo, enthanu veendath?' },
  // Marathi Voices
  { id: 'sarvam-meera', name: 'Meera', description: 'Marathi - Warm & Professional', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'mr-IN', testText: 'Namaskar! Mi tumchi AI sahaayak aahe. Aaj mi tumhala kashi madad karu?' },
  { id: 'sarvam-sachin', name: 'Sachin', description: 'Marathi - Friendly & Clear', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'mr-IN', testText: 'Namaskar! Mi Sachin. Tumhala kashi madad karu shakto?' },
  { id: 'sarvam-shweta', name: 'Shweta', description: 'Marathi - Soft & Pleasant', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'mr-IN', testText: 'Namaskar! Mi Shweta. Sanga, tumhala kay hava?' },
  { id: 'sarvam-ganesh', name: 'Ganesh', description: 'Marathi - Professional & Confident', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'mr-IN', testText: 'Namaskar! Mi Ganesh. Tumchya sevesathi hazir aahe.' },
  // Bengali Voices
  { id: 'sarvam-arjun', name: 'Arjun', description: 'Bengali - Friendly & Clear', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'bn-IN', testText: 'Namaskar! Ami apnar AI sahayak. Aaj ami apnake kibhabe sahajya korte pari?' },
  { id: 'sarvam-ritika', name: 'Ritika', description: 'Bengali - Warm & Professional', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'bn-IN', testText: 'Namaskar! Ami Ritika. Apnake kibhabe sahajya korte pari?' },
  { id: 'sarvam-sourav', name: 'Sourav', description: 'Bengali - Professional & Confident', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'bn-IN', testText: 'Namaskar! Ami Sourav. Apnar sevay achi.' },
  { id: 'sarvam-ishita', name: 'Ishita', description: 'Bengali - Soft & Gentle', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'bn-IN', testText: 'Namaskar! Ami Ishita. Bolun, ki dorkar?' },
  // Gujarati Voices
  { id: 'sarvam-hetal', name: 'Hetal', description: 'Gujarati - Warm & Friendly', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'gu-IN', testText: 'Kem cho! Hu tamari AI sahaayak chhu. Tamne kem madad kari shaku?' },
  { id: 'sarvam-jayesh', name: 'Jayesh', description: 'Gujarati - Professional & Clear', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'gu-IN', testText: 'Kem cho! Hu Jayesh chhu. Tamne shu madad joiye?' },
  { id: 'sarvam-nisha', name: 'Nisha', description: 'Gujarati - Soft & Pleasant', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'gu-IN', testText: 'Kem cho! Hu Nisha chhu. Kaho, shu seva karu?' },
  { id: 'sarvam-hardik', name: 'Hardik', description: 'Gujarati - Confident & Authoritative', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'gu-IN', testText: 'Kem cho! Hu Hardik chhu. Tamari sevama hazir chhu.' },
  // Punjabi Voices
  { id: 'sarvam-simran', name: 'Simran', description: 'Punjabi - Warm & Friendly', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'pa-IN', testText: 'Sat Sri Akal! Main tuhadi AI sahaayak haan. Tuhanu ki madad chahidi hai?' },
  { id: 'sarvam-gurpreet', name: 'Gurpreet', description: 'Punjabi - Professional & Clear', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'pa-IN', testText: 'Sat Sri Akal! Main Gurpreet haan. Tuhanu ki seva chahidi hai?' },
  { id: 'sarvam-manpreet', name: 'Manpreet', description: 'Punjabi - Soft & Pleasant', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'pa-IN', testText: 'Sat Sri Akal! Main Manpreet haan. Dasso, ki madad karaan?' },
  { id: 'sarvam-harjot', name: 'Harjot', description: 'Punjabi - Confident & Authoritative', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'pa-IN', testText: 'Sat Sri Akal! Main Harjot haan. Tuhaadi seva vich haan.' },
  // Odia Voices
  { id: 'sarvam-suchitra', name: 'Suchitra', description: 'Odia - Warm & Professional', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'or-IN', testText: 'Namaskar! Mu apananka AI sahaayak. Apananku kemiti sahajya kariba?' },
  { id: 'sarvam-biswajit', name: 'Biswajit', description: 'Odia - Friendly & Clear', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'or-IN', testText: 'Namaskar! Mu Biswajit. Apananku ki sahajya darkar?' },
  // Assamese Voices
  { id: 'sarvam-junali', name: 'Junali', description: 'Assamese - Warm & Friendly', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'as-IN', testText: 'Namaskar! Moi apunar AI sahayak. Apunok kenekoi sahaay korim?' },
  { id: 'sarvam-bhaskar', name: 'Bhaskar', description: 'Assamese - Professional & Clear', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'as-IN', testText: 'Namaskar! Moi Bhaskar. Apunok ki sahaay lagibo?' },
  // Urdu Voices
  { id: 'sarvam-zara', name: 'Zara', description: 'Urdu - Elegant & Professional', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'ur-IN', testText: 'Assalam-o-Alaikum! Main aapki AI sahaayak hoon. Aaj main aapki kaise madad kar sakti hoon?' },
  { id: 'sarvam-farhan', name: 'Farhan', description: 'Urdu - Warm & Friendly', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'ur-IN', testText: 'Assalam-o-Alaikum! Main Farhan hoon. Aapki khidmat mein hazir hoon.' },
  // AI4Bharat Voices (Open Source Indian Languages)
  // Telugu - AI4Bharat
  { id: 'ai4bharat-te-female', name: 'Telugu Female (AI4Bharat)', description: 'Telugu - Open Source', region: 'ai4bharat', gender: 'female', provider: 'ai4bharat', language: 'te-IN', testText: 'Namaskaram! Nenu mee AI sahaayakuraalini.' },
  { id: 'ai4bharat-te-male', name: 'Telugu Male (AI4Bharat)', description: 'Telugu - Open Source', region: 'ai4bharat', gender: 'male', provider: 'ai4bharat', language: 'te-IN', testText: 'Namaskaram! Nenu mee AI sahaayakudini.' },
  // Hindi - AI4Bharat
  { id: 'ai4bharat-hi-female', name: 'Hindi Female (AI4Bharat)', description: 'Hindi - Open Source', region: 'ai4bharat', gender: 'female', provider: 'ai4bharat', language: 'hi-IN', testText: 'Namaste! Main aapki AI sahaayak hoon.' },
  { id: 'ai4bharat-hi-male', name: 'Hindi Male (AI4Bharat)', description: 'Hindi - Open Source', region: 'ai4bharat', gender: 'male', provider: 'ai4bharat', language: 'hi-IN', testText: 'Namaste! Main aapka AI sahaayak hoon.' },
  // Tamil - AI4Bharat
  { id: 'ai4bharat-ta-female', name: 'Tamil Female (AI4Bharat)', description: 'Tamil - Open Source', region: 'ai4bharat', gender: 'female', provider: 'ai4bharat', language: 'ta-IN', testText: 'Vanakkam! Naan ungal AI udhaviyaalar.' },
  { id: 'ai4bharat-ta-male', name: 'Tamil Male (AI4Bharat)', description: 'Tamil - Open Source', region: 'ai4bharat', gender: 'male', provider: 'ai4bharat', language: 'ta-IN', testText: 'Vanakkam! Naan ungal AI udhaviyaalar.' },
  // Kannada - AI4Bharat
  { id: 'ai4bharat-kn-female', name: 'Kannada Female (AI4Bharat)', description: 'Kannada - Open Source', region: 'ai4bharat', gender: 'female', provider: 'ai4bharat', language: 'kn-IN', testText: 'Namaskara! Naanu nimma AI sahaayaki.' },
  { id: 'ai4bharat-kn-male', name: 'Kannada Male (AI4Bharat)', description: 'Kannada - Open Source', region: 'ai4bharat', gender: 'male', provider: 'ai4bharat', language: 'kn-IN', testText: 'Namaskara! Naanu nimma AI sahaayaka.' },
  // Malayalam - AI4Bharat
  { id: 'ai4bharat-ml-female', name: 'Malayalam Female (AI4Bharat)', description: 'Malayalam - Open Source', region: 'ai4bharat', gender: 'female', provider: 'ai4bharat', language: 'ml-IN', testText: 'Namaskkaram! Njan ningalude AI sahayi aanu.' },
  { id: 'ai4bharat-ml-male', name: 'Malayalam Male (AI4Bharat)', description: 'Malayalam - Open Source', region: 'ai4bharat', gender: 'male', provider: 'ai4bharat', language: 'ml-IN', testText: 'Namaskkaram! Njan ningalude AI sahayi aanu.' },
  // Bengali - AI4Bharat
  { id: 'ai4bharat-bn-female', name: 'Bengali Female (AI4Bharat)', description: 'Bengali - Open Source', region: 'ai4bharat', gender: 'female', provider: 'ai4bharat', language: 'bn-IN', testText: 'Namaskar! Ami apnar AI sahayak.' },
  { id: 'ai4bharat-bn-male', name: 'Bengali Male (AI4Bharat)', description: 'Bengali - Open Source', region: 'ai4bharat', gender: 'male', provider: 'ai4bharat', language: 'bn-IN', testText: 'Namaskar! Ami apnar AI sahayak.' },
  // Marathi - AI4Bharat
  { id: 'ai4bharat-mr-female', name: 'Marathi Female (AI4Bharat)', description: 'Marathi - Open Source', region: 'ai4bharat', gender: 'female', provider: 'ai4bharat', language: 'mr-IN', testText: 'Namaskar! Mi tumchi AI sahaayak aahe.' },
  { id: 'ai4bharat-mr-male', name: 'Marathi Male (AI4Bharat)', description: 'Marathi - Open Source', region: 'ai4bharat', gender: 'male', provider: 'ai4bharat', language: 'mr-IN', testText: 'Namaskar! Mi tumcha AI sahaayak aahe.' },
  // Gujarati - AI4Bharat
  { id: 'ai4bharat-gu-female', name: 'Gujarati Female (AI4Bharat)', description: 'Gujarati - Open Source', region: 'ai4bharat', gender: 'female', provider: 'ai4bharat', language: 'gu-IN', testText: 'Kem cho! Hu tamari AI sahaayak chhu.' },
  { id: 'ai4bharat-gu-male', name: 'Gujarati Male (AI4Bharat)', description: 'Gujarati - Open Source', region: 'ai4bharat', gender: 'male', provider: 'ai4bharat', language: 'gu-IN', testText: 'Kem cho! Hu tamaro AI sahaayak chhu.' },
  // OpenAI Voices (Indian)
  { id: 'openai-nova', name: 'Ananya', description: 'English - Friendly', region: 'india', gender: 'female', provider: 'openai', language: 'en-IN' },
  { id: 'openai-shimmer', name: 'Lakshmi', description: 'English - Warm', region: 'india', gender: 'female', provider: 'openai', language: 'en-IN' },
  { id: 'openai-alloy', name: 'Shreya', description: 'English - Clear', region: 'india', gender: 'female', provider: 'openai', language: 'en-IN' },
  { id: 'openai-echo', name: 'Raj', description: 'English - Conversational', region: 'india', gender: 'male', provider: 'openai', language: 'en-IN' },
  { id: 'openai-onyx', name: 'Vikram', description: 'English - Professional', region: 'india', gender: 'male', provider: 'openai', language: 'en-IN' },
  { id: 'openai-fable', name: 'Kiran', description: 'English - Engaging', region: 'india', gender: 'male', provider: 'openai', language: 'en-IN' },
  // OpenAI Voices (International)
  { id: 'openai-nova-intl', name: 'Nova', description: 'Friendly, upbeat', region: 'international', gender: 'female', provider: 'openai', language: 'en-US' },
  { id: 'openai-shimmer-intl', name: 'Shimmer', description: 'Soft, gentle', region: 'international', gender: 'female', provider: 'openai', language: 'en-US' },
  { id: 'openai-alloy-intl', name: 'Alloy', description: 'Neutral, balanced', region: 'international', gender: 'neutral', provider: 'openai', language: 'en-US' },
  { id: 'openai-echo-intl', name: 'Echo', description: 'Warm, conversational', region: 'international', gender: 'male', provider: 'openai', language: 'en-US' },
  { id: 'openai-onyx-intl', name: 'Onyx', description: 'Deep, authoritative', region: 'international', gender: 'male', provider: 'openai', language: 'en-US' },
  { id: 'openai-fable-intl', name: 'Fable', description: 'Expressive, narrative', region: 'international', gender: 'male', provider: 'openai', language: 'en-US' },
];

export const languageOptions: LanguageOption[] = [
  { id: 'en-IN', name: 'English (India)', flag: '🇮🇳', countryCode: 'IN', popular: true, greetingTemplate: 'Hello! How can I help you today?' },
  { id: 'hi-IN', name: 'Hindi', flag: '🇮🇳', countryCode: 'IN', popular: true, greetingTemplate: 'Namaste! Main aapki kya madad kar sakta hoon?' },
  { id: 'te-IN', name: 'Telugu', flag: '🇮🇳', countryCode: 'IN', popular: true, greetingTemplate: 'Namaskaram! Nenu mee ki ela sahaayam cheyagalanu?' },
  { id: 'ta-IN', name: 'Tamil', flag: '🇮🇳', countryCode: 'IN', popular: true, greetingTemplate: 'Vanakkam! Ungalukku eppadi udhavi seiya mudiyum?' },
  { id: 'kn-IN', name: 'Kannada', flag: '🇮🇳', countryCode: 'IN', greetingTemplate: 'Namaskara! Naanu nimge hege sahaaya maadaballe?' },
  { id: 'ml-IN', name: 'Malayalam', flag: '🇮🇳', countryCode: 'IN', greetingTemplate: 'Namaskkaram! Ninakku njan engane sahaayikkum?' },
  { id: 'mr-IN', name: 'Marathi', flag: '🇮🇳', countryCode: 'IN', greetingTemplate: 'Namaskar! Mi tumhala kashi madad karu shakto?' },
  { id: 'bn-IN', name: 'Bengali', flag: '🇮🇳', countryCode: 'IN', greetingTemplate: 'Namaskar! Ami apnake ki bhabe sahajya korte pari?' },
  { id: 'gu-IN', name: 'Gujarati', flag: '🇮🇳', countryCode: 'IN', greetingTemplate: 'Kem cho! Hu tamne kem madad kari shaku?' },
  { id: 'pa-IN', name: 'Punjabi', flag: '🇮🇳', countryCode: 'IN', greetingTemplate: 'Sat Sri Akal! Main tuhadi ki madad kar sakda haan?' },
  { id: 'or-IN', name: 'Odia', flag: '🇮🇳', countryCode: 'IN', greetingTemplate: 'Namaskar! Mu apananku kemiti sahajya kariba?' },
  { id: 'as-IN', name: 'Assamese', flag: '🇮🇳', countryCode: 'IN', greetingTemplate: 'Namaskar! Moi apunok kenekoi sahaay korim?' },
  { id: 'ur-IN', name: 'Urdu', flag: '🇮🇳', countryCode: 'IN', greetingTemplate: 'Assalam-o-Alaikum! Main aapki kaise madad kar sakta hoon?' },
  { id: 'en-US', name: 'English (US)', flag: '🇺🇸', countryCode: 'US', greetingTemplate: 'Hello! How can I help you today?' },
  { id: 'en-GB', name: 'English (UK)', flag: '🇬🇧', countryCode: 'GB', greetingTemplate: 'Hello! How may I assist you today?' },
  { id: 'en-AU', name: 'English (Australia)', flag: '🇦🇺', countryCode: 'AU', greetingTemplate: 'G\'day! How can I help you today?' },
  { id: 'auto', name: 'Auto-detect', flag: '🌐', countryCode: 'globe', greetingTemplate: 'Hello! How can I help you today?' },
];

export const llmOptions: LLMOption[] = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast & Cost-effective', provider: 'OpenAI' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable, best reasoning', provider: 'OpenAI' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High performance, faster', provider: 'OpenAI' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast & efficient', provider: 'Google' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', description: 'Quick & concise', provider: 'Anthropic' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', description: 'Balanced performance', provider: 'Anthropic' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', description: 'Most intelligent', provider: 'Anthropic' },
];

export const availableVariables: Variable[] = [
  { key: 'firstName', label: 'First Name', example: 'John' },
  { key: 'lastName', label: 'Last Name', example: 'Doe' },
  { key: 'phone', label: 'Phone', example: '+1234567890' },
  { key: 'email', label: 'Email', example: 'john@example.com' },
  { key: 'company', label: 'Company', example: 'Acme Inc' },
  { key: 'INSTITUTION_NAME', label: 'Institution Name', example: 'MyLeadX' },
  { key: 'INSTITUTION_PHONE', label: 'Institution Phone', example: '+1800123456' },
];

export const defaultFormData = {
  name: '',
  voiceId: 'sarvam-priya',
  voiceName: 'Priya',
  language: 'hi-IN',
  widgetColor: '#3B82F6',
  widgetTitle: '',
  widgetSubtitle: '',
  greeting: '',
  systemPrompt: '',
  questions: [] as any[],
  documents: [] as any[],
  useCustomVoice: false,
  customVoiceName: '',
  personality: 'professional' as const,
  responseSpeed: 'normal' as const,
  creativity: 0.7,
  interruptHandling: 'polite' as const,
  workingHoursEnabled: false,
  workingHoursStart: '09:00',
  workingHoursEnd: '18:00',
  workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  afterHoursMessage: "Thank you for calling. Our office is currently closed. Please call back during business hours or leave a message.",
  maxCallDuration: 10,
  silenceTimeout: 30,
  recordCalls: true,
  autoCreateLeads: true,
  deduplicateByPhone: true,
  defaultStageId: '',
  defaultAssigneeId: '',
  appointmentEnabled: false,
  appointmentType: 'consultation',
  appointmentDuration: 30,
  crmIntegration: 'internal' as const,
  triggerWebhookOnLead: true,
  callFlowId: '',
};

export const defaultIntegrations = {
  calendar: {
    enabled: false,
    provider: 'google' as const,
    connected: false,
    calendarId: '',
    bufferTime: 15,
    workingHours: { start: '09:00', end: '18:00' },
  },
  crm: {
    enabled: false,
    provider: 'internal' as const,
    connected: false,
    autoCreateLead: true,
    autoUpdateStatus: true,
    fieldMapping: {} as Record<string, string>,
  },
  payment: {
    enabled: false,
    provider: 'razorpay' as const,
    connected: false,
    currency: 'INR',
    collectDuringCall: false,
  },
  customApi: {
    enabled: false,
    endpoints: [] as any[],
  },
};

export const defaultFunctions = [
  { id: '1', name: 'Book Appointment', description: 'Schedule appointments with leads', type: 'book_appointment' as const, enabled: true, config: {} },
  { id: '2', name: 'Transfer Call', description: 'Transfer to human agent when needed', type: 'transfer_call' as const, enabled: true, config: {} },
  { id: '3', name: 'Send SMS', description: 'Send confirmation or follow-up SMS', type: 'send_sms' as const, enabled: false, config: {} },
  { id: '4', name: 'Lookup CRM', description: 'Fetch lead details from CRM', type: 'lookup_crm' as const, enabled: false, config: {} },
  { id: '5', name: 'End Call', description: 'Gracefully end the conversation', type: 'end_call' as const, enabled: true, config: {} },
];
