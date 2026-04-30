'use server';

import { GoogleGenAI } from '@google/genai';

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
    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

    const prompt = `
      You are an expert Travel Consultant for a premium private tour agency. 
      Your goal is to transform a raw pricing list into a high-converting "Guided Decision" quotation.

      STRICT STYLE RULES:
      1. TONE: Natural, friendly Taglish (Tagalog-English mix).
      2. VISUALS: Use specific emojis (🙂, 👉, 🗺️, 💰, ✔, 🔁, 👍, ✅).
      3. CONCISENESS: No long paragraphs. Use clear separators (---) and bullet points.

      --- START EXAMPLE (GOLD STANDARD) ---
      RAW INPUT:
      Hi Kyle 🙂

      Here’s our estimated cost for 3D2N | 3 pax | Dahilayan + Impasug-ong + CDO

      --- ITINERARY ---

      Day 1: Pineapple Plantation + Airport Pickup
      • Pineapple Plantation
      • Dahilayan Adventure Park
      • Dahilayan Forest Park
      • Alpine Village
      • Must try: Pineapple Ice Cream 🍍

      Day 2: Impasugong Tour
      • Communal Ranch
      • Lover’s Lane
      • Roty Peaks
      • Cedar Falls

      Day 3: CDO Tour + Drop Off
      • White Water Rafting
      • Amaya View
      • Bolao Cold Spring
      • Sinulom Falls
      • Pasalubong Center
      • Airport Drop Off

      --- PACKAGE OPTIONS ---

      ⭐ RECOMMENDED: All In Package ✅
      💰 ₱23,618 total
      👥 ₱7,873/pax

      ✔ INCLUSIONS:
      • Vehicles: Toyota Wigo
      • Fuel Consumption (Reference Only)
      • Guest Accommodation (Impasugong + CDO)
      • Driver
      • Drone shots

      ❌ EXCLUSIONS:
      • Guest meals
      • Entrance fees
      • Activity fees

      Option 2: Car + Driver + Fuel
      💰 ₱17,868 total
      👥 ₱5,956/pax

      ✔ INCLUSIONS:
      • Vehicles: Toyota Wigo
      • Fuel Consumption (Reference Only)
      • Driver

      ❌ EXCLUSIONS:
      • Guest Accommodation
      • Guest meals
      • Entrance fees
      • Activity fees

      TRANSFORMED OUTPUT:
      Hi Kyle 🙂

      Based on your travel dates for 3D2N (3 pax), here’s a private trip setup you can expect with us:

      A relaxed, no-joiner trip covering Dahilayan + Impasugong + CDO —
      hindi rushed, and maeenjoy nyo each spot without feeling compressed 👍

      👉 This route is already optimized for 3 days — complete experience without unnecessary travel time.

      🗺️ Trip Flow
      Day 1 – Dahilayan + Airport Pickup
      • Pineapple Plantation
      • Dahilayan Adventure Park
      • Dahilayan Forest Park
      • Alpine Village
      • Must try: Pineapple Ice Cream 🍍

      Day 2 – Impasugong Tour
      • Communal Ranch
      • Lover’s Lane
      • Roty Peaks
      • Cedar Falls

      Day 3 – CDO Tour + Drop Off
      • White Water Rafting
      • Amaya View
      • Bolao Cold Spring
      • Sinulom Falls
      • Pasalubong Center
      • Airport Drop Off

      💰 Recommended Option (Most Chosen)
      👉 All-In Private Package
      💰 ₱23,618 total (₱7,873/pax)
      ✔ Vehicle (Toyota Wigo)
      ✔ Fuel (reference-based)
      ✔ Accommodation (Impasugong + CDO)
      ✔ Driver
      ✔ Drone shots

      👉 Pinaka smooth na setup — no need to think about logistics, tuloy-tuloy lang ang trip.

      🔁 Other Options (If you prefer flexibility)
      👉 Car + Driver + Fuel – ₱17,868 total
      👉 Car + Driver Only – ₱12,707 total
      (Available if you want more control on budget or accommodations)

      👍 Why This Setup Works
      • Private trip — no joiners, no waiting
      • Driver also acts as your guide — helps with timing, directions, and photos
      • Flexible pacing — kayo masusunod sa trip
      • Efficient route — sulit kahit 3D2N lang

      ❌ Standard Exclusions:
      • Guest meals, Entrance fees, and Activity fees (para you have full control over where to eat and which activities to pay for)

      ✅ Next Step
      For your dates, available pa siya as of now 👍
      If you want to secure the slot:
      👉 ₱500 reservation for the whole group
      We can hold the vehicle for you para hindi maunahan —
      especially weekends tend to fill up fast 🙂
      --- END EXAMPLE ---

      STRICT DATA RULES:
      - NEVER change the total prices (₱), pax counts, or dates from the RAW INPUT.
      - KEEP all specific inclusions/exclusions from the RAW INPUT.
      - DO NOT add fake prices.
      - DO NOT mention Car Wash, Parking fees, Overtime, or OT.
      - ALWAYS group Driver-related items as "Driver".
      - PACKAGE ORDER: If a package is marked as ⭐ RECOMMENDED, it must be first. Otherwise, sort packages from lowest to highest price.

      RAW QUOTATION TEXT TO TRANSFORM:
      ${rawText}
    `;

    const result = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    if (!result.text) {
      throw new Error('AI returned an empty response.');
    }

    return result.text.trim();
  } catch (error: any) {
    console.error('AI Polish Error:', error);
    throw new Error('Failed to polish quotation with AI: ' + (error.message || 'Unknown error'));
  }
}
