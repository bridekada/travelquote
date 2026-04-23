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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
      You are a professional travel agency consultant. Your task is to "polish" the following travel quotation to make it sound more professional, welcoming, and persuasive.

      STRICT RULES:
      1. DO NOT change any prices (₱), dates, or itinerary items.
      2. Keep the structure clear (Itinerary, Package Options, Inclusions/Exclusions, Notes).
      3. Use professional and friendly language.
      4. You may improve the formatting using better emojis or bullet points to make it more readable.
      5. The output must be the final polished text only, no extra commentary.

      RAW QUOTATION TEXT:
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
