import { GoogleGenAI, Type, Modality } from "@google/genai";

const getAiClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Uses Google Search to verify product details and get a real price estimate.
 */
export const enrichRequestData = async (
    productUrl: string, 
    userTitle: string, 
    userReason: string
): Promise<{ title: string; price: number; description: string; category: string }> => {
    
    const ai = getAiClient();
    
    // We use search grounding to get real data
    const prompt = `
    I need to verify a product request for a donation platform.
    
    User Input:
    - URL: ${productUrl}
    - Title: ${userTitle}
    - Reason: ${userReason}

    Task:
    1. Search for this product online to verify it exists and get its approximate price.
    2. Infer the best category for it.
    3. Write a short description.
    
    Return the result in JSON format.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        price: { type: Type.NUMBER },
                        description: { type: Type.STRING },
                        category: { type: Type.STRING }
                    },
                    required: ["title", "price", "description", "category"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini Enrichment Error:", error);
        // Fallback mock data if API fails or key is missing
        return {
            title: userTitle,
            price: 0,
            description: "Verified details could not be retrieved.",
            category: "General"
        };
    }
};

/**
 * Analyzes an uploaded image to auto-fill the request form.
 */
export const analyzeImageForRequest = async (base64Image: string): Promise<{ title: string; category: string; reason: string }> => {
    const ai = getAiClient();
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: "image/jpeg", 
                            data: cleanBase64
                        }
                    },
                    {
                        text: `Analyze this image. The user wants to request this item (or a replacement) on a donation community board.
                        1. Identify the item title (be specific).
                        2. Select the best category from: Essentials, Education, Art & Hobbies, Family & Kids, Tools & Trade, Other.
                        3. Write a draft "Reason" for why someone might need this (keep it generic but plausible based on the item type, e.g. "I need this tool for a project").`
                    }
                ]
            }
        });

        const text = response.text || "";
        
        // Force structure via a second pass
        const structureAi = getAiClient();
        const structureResponse = await structureAi.models.generateContent({
             model: "gemini-3-flash-preview",
             contents: `Convert this description into JSON with keys: title, category, reason. Description: ${text}`,
             config: {
                 responseMimeType: "application/json",
                 responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        category: { type: Type.STRING },
                        reason: { type: Type.STRING }
                    }
                 }
             }
        });
        
        return JSON.parse(structureResponse.text || "{}");

    } catch (error) {
        console.error("Image Analysis Error:", error);
        throw new Error("Could not analyze image.");
    }
};

/**
 * Analyzes audio input to auto-fill the request form.
 */
export const analyzeAudioForRequest = async (base64Audio: string): Promise<{ title: string; category: string; reason: string }> => {
    const ai = getAiClient();
    // Remove header if present (e.g., "data:audio/webm;base64,")
    const cleanBase64 = base64Audio.split(',')[1] || base64Audio;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-native-audio-preview-12-2025",
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: "audio/mp3", // Generic container, model handles most standard audio
                            data: cleanBase64
                        }
                    },
                    {
                        text: `Listen to this user request. They are asking for an item on a donation board.
                        Extract the following details:
                        1. Title: What item do they need? (Keep it concise).
                        2. Category: Choose best from Essentials, Education, Art & Hobbies, Family & Kids, Tools & Trade, Other.
                        3. Reason: Transcribe or summarize *why* they need it. Make it sound personal and sincere based on their voice message.
                        
                        Return JSON.`
                    }
                ]
            },
            config: {
                 responseMimeType: "application/json",
                 responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        category: { type: Type.STRING },
                        reason: { type: Type.STRING }
                    },
                    required: ["title", "category", "reason"]
                 }
            }
        });

        return JSON.parse(response.text || "{}");

    } catch (error) {
        console.error("Audio Analysis Error:", error);
        throw new Error("Could not analyze audio. Please try typing instead.");
    }
};

/**
 * Transcribes audio for general comments.
 */
export const transcribeAudio = async (base64Audio: string): Promise<string> => {
    const ai = getAiClient();
    const cleanBase64 = base64Audio.split(',')[1] || base64Audio;
    
    try {
        const response = await ai.models.generateContent({
             model: "gemini-2.5-flash-native-audio-preview-12-2025",
             contents: {
                parts: [
                    { inlineData: { mimeType: "audio/mp3", data: cleanBase64 } },
                    { text: "Transcribe this audio exactly as spoken. Return only the transcription text." }
                ]
             }
        });
        return response.text || "";
    } catch (e) {
        console.error(e);
        return "";
    }
};

/**
 * Generates an image for the request based on the title and category.
 */
export const generateRequestImage = async (title: string, category: string): Promise<string | null> => {
    const ai = getAiClient();
    const prompt = `A clean, flat vector-style illustration of ${title}, suitable for a category of ${category}. Colorful, minimal background, high quality icon style.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                imageConfig: {
                    aspectRatio: "1:1"
                }
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (error) {
        console.error("Image Generation Error:", error);
        return null;
    }
};

/**
 * Generates speech from text using Gemini TTS.
 */
export const generateRequestSpeech = async (text: string): Promise<string | null> => {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (error) {
        console.error("TTS Error:", error);
        return null;
    }
};

/**
 * Summarizes a forum thread including its title, content, and replies.
 */
export const summarizeForumThread = async (
    title: string, 
    content: string, 
    replies: { authorName: string, content: string }[]
): Promise<string> => {
    const ai = getAiClient();
    
    const replyText = replies.map(r => `${r.authorName}: ${r.content}`).join('\n');
    const prompt = `
    Summarize the following community forum discussion into a concise 2-3 sentence "TL;DR".
    
    Thread Title: ${title}
    Original Post: ${content}
    
    Replies:
    ${replyText}
    
    Focus on the main question asked and the consensus or best advice given in the replies.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 0 } 
            }
        });
        return response.text || "Could not summarize discussion.";
    } catch (e) {
        return "Summary currently unavailable.";
    }
};

/**
 * Generates an epic, short description of the user's impact for the leaderboard.
 */
export const generateUserImpactDescription = async (
    displayName: string, 
    itemsGifted: number, 
    bio: string
): Promise<string> => {
    const ai = getAiClient();
    const prompt = `
    Write a short, epic, and slightly humorous "Legend Title" (max 15 words) for a community member named ${displayName}.
    They have gifted ${itemsGifted} items to strangers.
    Their bio is: "${bio}".
    
    Example: "The Legendary Gifter of the North, turning requests into reality."
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        });
        return response.text || "A true community hero making waves.";
    } catch (e) {
        return "A legend in our community.";
    }
};

/**
 * Drafts a "Success Story" forum post based on a fulfilled request.
 */
export const draftSuccessStoryThread = async (
    itemTitle: string,
    donorName: string,
    originalReason: string,
    thankYouMessage: string
): Promise<{ title: string; content: string }> => {
    const ai = getAiClient();
    const prompt = `
    A user just received a gift of "${itemTitle}" from "${donorName || 'Anonymous'}" on a community giving platform.
    
    Draft a heartwarming forum post for the "Success Stories" section.
    
    Context:
    - Original Need: "${originalReason}"
    - User's Thank You Note: "${thankYouMessage}"
    
    Output JSON with:
    - title: A catchy title (e.g., "Huge thanks to [User] for the [Item]!")
    - content: The body of the post (3-4 sentences). Make it sound grateful, mentioning how this helps them.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING }
                    },
                    required: ["title", "content"]
                }
            }
        });
        return JSON.parse(response.text || '{"title": "Thank you!", "content": "I received my item."}');
    } catch (e) {
        return { 
            title: `Thank you ${donorName || 'Donor'}!`, 
            content: `I just wanted to say a huge thank you for the ${itemTitle}. It really helps me out!` 
        };
    }
};

/**
 * Generates a warm thank you message based on the item and context.
 */
export const generateThankYouMessage = async (
    itemTitle: string,
    donorName: string | undefined
): Promise<string> => {
    const ai = getAiClient();
    const prompt = `
    Write a short, heartfelt thank you note (max 40 words) from a recipient to a donor for receiving: "${itemTitle}".
    The donor's name is ${donorName || 'Anonymous'}.
    Mention how much it helps. Be sincere and warm.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        });
        return response.text || "Thank you so much for your generosity!";
    } catch (error) {
        return "Thank you so much! This means the world to me.";
    }
};

/**
 * Generates a personalized gift message from the donor to the requester.
 */
export const generateGiftMessage = async (
    itemTitle: string,
    requesterName: string,
    tone: 'warm' | 'funny' | 'inspiring'
): Promise<string> => {
    const ai = getAiClient();
    const prompt = `
    Write a ${tone} gift note (max 30 words) to accompany a gift of "${itemTitle}" for ${requesterName}.
    - Warm: Friendly and supportive.
    - Funny: A lighthearted pun or joke about the item.
    - Inspiring: Encouraging them to pursue their passion.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        });
        return response.text || "Hope this helps you out! Enjoy.";
    } catch (error) {
        return "Sending this with best wishes!";
    }
};

/**
 * Generates safety tips for the fulfiller based on the request context.
 */
export const getSafetyTips = async (
    itemTitle: string,
    location: string,
    shippingAddress: string
): Promise<string[]> => {
    const ai = getAiClient();
    const prompt = `
    I am about to fulfill a request for "${itemTitle}" located in "${location}".
    The provided address/shipping info is: "${shippingAddress}".
    
    Provide 2 brief, specific safety tips for me as the donor. 
    - If it looks like a meetup, mention public places.
    - If it's shipping, mention privacy.
    - If the item is high value, mention verification.
    Return as a JSON array of strings.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        tips: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        const res = JSON.parse(response.text || "{}");
        return res.tips || ["Keep your personal info private.", "Verify the address before shipping."];
    } catch (error) {
        return ["Ensure you are comfortable with the cost.", "Keep your transaction details on the platform."];
    }
};

/**
 * Validates text content for safety using Gemini.
 */
export const validateContent = async (text: string): Promise<{ safe: boolean; reason?: string }> => {
  const ai = getAiClient();
  const prompt = `
    Analyze the following text for a community donation platform.
    Text: "${text}"
    
    Is this text safe, respectful, and appropriate? It should not contain hate speech, harassment, explicit content, or obviously fraudulent claims.
    Return JSON: { "safe": boolean, "reason": string (optional, if unsafe) }
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
         responseSchema: {
            type: Type.OBJECT,
            properties: {
                safe: { type: Type.BOOLEAN },
                reason: { type: Type.STRING }
            },
            required: ["safe"]
         }
      }
    });
    
    const result = JSON.parse(response.text || '{}');
    return result;
  } catch (e) {
    return { safe: true }; 
  }
};

/**
 * Recommends requests based on user profile.
 */
export const getSmartRecommendations = async (
  userBio: string, 
  userHobbies: string[], 
  requests: {id: string, title: string, reason: string, category: string}[]
): Promise<string[]> => {
    const ai = getAiClient();
    const shortList = requests.slice(0, 30); 
    
    const prompt = `
    I am a user with this profile:
    Bio: ${userBio}
    Hobbies: ${userHobbies.join(', ')}
    
    Here is a list of open requests:
    ${JSON.stringify(shortList)}
    
    Identify up to 3 request IDs that best match my skills, hobbies, or interests.
    Return JSON: { "recommendedIds": ["id1", "id2"] }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        recommendedIds: { 
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["recommendedIds"]
                }
            }
        });
        const result = JSON.parse(response.text || '{}');
        return result.recommendedIds || [];
    } catch (e) {
        return [];
    }
};

export interface BuyingOption {
    title: string;
    uri: string;
}

export const findBuyingOptions = async (productTitle: string): Promise<{ text: string, options: BuyingOption[] }> => {
    const ai = getAiClient();
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Find places to buy "${productTitle}" online. List 3 distinct retailers with estimated prices if possible.`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        const text = response.text || "No suggestions found.";
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const options: BuyingOption[] = [];
        
        chunks.forEach((chunk: any) => {
            if (chunk.web?.uri && chunk.web?.title) {
                options.push({
                    title: chunk.web.title,
                    uri: chunk.web.uri
                });
            }
        });

        const uniqueOptions = options.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i);
        return { text, options: uniqueOptions };

    } catch (error) {
        console.error("Search failed:", error);
        return { text: "Unable to search at this time.", options: [] };
    }
};

export const findLocalStores = async (productQuery: string, lat: number, lng: number): Promise<{ text: string, options: BuyingOption[] }> => {
    const ai = getAiClient();
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Find places to buy "${productQuery}" near me. List 3 distinct local stores with estimated prices if possible.`,
            config: {
                tools: [{ googleMaps: {} }],
                toolConfig: {
                    retrievalConfig: {
                        latLng: {
                            latitude: lat,
                            longitude: lng
                        }
                    }
                }
            }
        });

        const text = response.text || "No local stores found.";
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const options: BuyingOption[] = [];
        
        chunks.forEach((chunk: any) => {
            if (chunk.web?.uri && chunk.web?.title) {
                 options.push({
                    title: chunk.web.title,
                    uri: chunk.web.uri
                });
            } else if (chunk.maps?.uri && chunk.maps?.title) {
                 options.push({
                    title: chunk.maps.title,
                    uri: chunk.maps.uri
                });
            }
        });

        const uniqueOptions = options.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i);
        return { text, options: uniqueOptions };

    } catch (error) {
        console.error("Local Search failed:", error);
        return { text: "Unable to search locally at this time.", options: [] };
    }
};

/**
 * Verifies a receipt image to check if it matches the expected item.
 */
export const verifyReceipt = async (
    receiptBase64: string,
    expectedItemTitle: string
): Promise<{ verified: boolean; status: 'verified' | 'warning'; reasoning: string }> => {
    const ai = getAiClient();
    const cleanBase64 = receiptBase64.split(',')[1] || receiptBase64;

    const prompt = `
    Analyze this image. It is supposed to be a proof of purchase (receipt, order confirmation, or photo of item) for: "${expectedItemTitle}".
    
    Task:
    1. Determine if this is a valid proof of purchase or possession.
    2. Check if the text or visual contents match the expected item "${expectedItemTitle}".
    
    Return JSON:
    {
        "verified": boolean (true if it looks reasonably correct, false if it looks completely wrong or unrelated),
        "status": "verified" | "warning",
        "reasoning": "Short explanation of your finding (max 15 words)"
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        verified: { type: Type.BOOLEAN },
                        status: { type: Type.STRING, enum: ["verified", "warning"] },
                        reasoning: { type: Type.STRING }
                    },
                    required: ["verified", "status", "reasoning"]
                }
            }
        });

        return JSON.parse(response.text || '{"verified": false, "status": "warning", "reasoning": "Could not verify image."}');
    } catch (error) {
        console.error("Receipt Verification Error:", error);
        return { verified: false, status: 'warning', reasoning: "AI verification failed." };
    }
};

/**
 * Converts GPS Coordinates to an approximate address string using Gemini Google Maps grounding.
 */
export const getApproximateAddress = async (lat: number, lng: number): Promise<string> => {
    const ai = getAiClient();
    try {
        // We use gemini-2.5-flash which supports Google Maps tool
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `What is the approximate address or location name at latitude ${lat}, longitude ${lng}? Return only the address string, nothing else.`,
            config: {
                tools: [{ googleMaps: {} }],
                toolConfig: {
                    retrievalConfig: {
                        latLng: {
                            latitude: lat,
                            longitude: lng
                        }
                    }
                }
            }
        });
        
        return response.text?.trim() || `GPS: ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    } catch (error) {
        console.error("Reverse Geocode Error:", error);
        return `GPS: ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    }
};