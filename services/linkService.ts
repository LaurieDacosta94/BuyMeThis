
export interface LinkMetadata {
    title: string;
    description: string;
    image: string | null;
    url: string;
    publisher?: string;
}

/**
 * Fetches metadata from a URL using the Microlink API.
 * This retrieves title, description, and image without using AI.
 */
export const fetchLinkMetadata = async (url: string): Promise<LinkMetadata | null> => {
    try {
        const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
        const json = await response.json();
        
        if (json.status === 'success') {
            const { title, description, image, url: finalUrl, publisher } = json.data;
            return {
                title: title || '',
                description: description || '',
                image: image?.url || null,
                url: finalUrl,
                publisher: publisher
            };
        }
        return null;
    } catch (error) {
        console.error("Link metadata fetch failed:", error);
        return null;
    }
};
