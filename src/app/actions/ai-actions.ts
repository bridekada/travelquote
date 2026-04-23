'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Polishes a travel quotation text using Google Gemini AI.
 * Maintaing all prices, dates, and itinerary details while improving tone.
 */
export async function polishQuotation(rawText: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment variables.');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash' });

    const prompt = `
      You are an expert Travel Consultant for a premium private tour agency. 
      Your goal is to transform a raw pricing list into a high-converting "Guided Decision" quotation using the GDQ Framework.

      STRICT PHILOSOPHY:
      1. PRICE -> EXPERIENCE: Don't just list prices. Sell the vibe (e.g., "Relaxed trip," "hindi rushed," "no joiners," "kayo masusunod").
      2. REDUCE THINKING: Highlight the "Recommended Option" as the "Most Chosen" or "Pinaka smooth."
      3. VALUE CERTAINTY: Use phrases like "Kami na bahala sa logistics," "Tuloy-tuloy lang ang trip," and "Peace of mind."
      4. DRIVER-GUIDE: Always frame the driver as a "Driver-guide" who helps with photos and timing.
      5. LANGUAGE: Use a friendly, professional "Taglish" (Tagalog-English mix) tone.

      STRUCTURE TO FOLLOW:
      - Intro: Acknowledge dates/pax and set the vibe (e.g., "Here's a private trip setup... hindi rushed").
      - Trip Flow: Summarize the itinerary briefly but vividly.
      - Recommended Option: Highlight the All-In package first. Label it "Recommended (Most Chosen)."
      - Other Options: List the cheaper options as "Flexibility" choices.
      - Why This Setup Works: Use 3-4 bullet points emphasizing "No joiners," "Private pacing," and "Driver-guide."
      - Next Step: Clear call to action about the reservation fee.

      STRICT DATA RULES:
      - NEVER change the total prices (₱), pax counts, or dates.
      - KEEP all specific inclusions/exclusions mentioned in the raw text.

      RAW QUOTATION TEXT TO TRANSFORM:
      ${rawText}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const polishedText = response.text();

    return polishedText.trim();
  } catch (error: any) {
    console.error('AI Polish Error:', error);
    throw new Error('Failed to polish quotation with AI: ' + (error.message || 'Unknown error'));
  }
}
