
export enum RequestStatus {
  OPEN = 'OPEN',
  PENDING = 'PENDING', // Fulfiller committed (legacy/primary status)
  FULFILLED = 'FULFILLED', // Fulfiller confirmed purchase
  RECEIVED = 'RECEIVED' // Requester confirmed receipt
}

export enum LocationFilter {
  LOCAL = 'LOCAL',
  NATIONAL = 'NATIONAL',
  WORLDWIDE = 'WORLDWIDE'
}

export enum Category {
  ESSENTIALS = 'Essentials',
  EDUCATION = 'Education',
  ART_HOBBY = 'Art & Hobbies',
  FAMILY = 'Family & Kids',
  TOOLS = 'Tools & Trade',
  OTHER = 'Other'
}

export enum DeliveryPreference {
  SHIPPING = 'Shipping',
  IN_PERSON = 'In Person',
  ANY = 'Any Method'
}

export enum ForumCategory {
  GENERAL = 'General Chat',
  ADVICE = 'Advice & Tips',
  STORIES = 'Success Stories',
  META = 'Site Feedback'
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Badge {
  id: string;
  label: string;
  icon: string; // Lucide icon name or emoji
  description: string;
  color: string; // tailwind color class
}

export interface User {
  id: string;
  displayName: string;
  handle: string;
  bio: string;
  avatarUrl: string;
  bannerUrl?: string; // New field
  projects: string[]; // "Current Projects"
  hobbies: string[];
  location: string;
  coordinates?: Coordinates;
  trustScore: number;
  badges: Badge[];
  isAdmin?: boolean; // Admin flag
}

export interface ProductDetails {
  title: string;
  price: number;
  imageUrl: string;
  description: string;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface Fulfillment {
  fulfillerId: string;
  status: RequestStatus; // PENDING | FULFILLED
  trackingNumber?: string;
  proofOfPurchaseImage?: string;
  giftMessage?: string;
  receiptVerificationStatus?: 'verified' | 'warning' | 'pending';
  createdAt: string;
}

export interface RequestItem {
  id: string;
  requesterId: string;
  title: string;
  productUrl: string;
  reason: string; // The "Why"
  shippingAddress: string; // Hidden unless fulfilling
  status: RequestStatus;
  category: Category;
  deliveryPreference: DeliveryPreference; // New field
  createdAt: string;
  location: string; // City, Country
  coordinates?: Coordinates;
  
  // Enriched Data (Simulated Scraping)
  enrichedData?: ProductDetails;

  // Fulfillment Data
  candidates: string[]; // List of user IDs who offered to help
  fulfillerId?: string; // Primary fulfiller (legacy/display)
  fulfillments?: Fulfillment[]; // Multi-user fulfillment tracking
  
  trackingNumber?: string; // Legacy/Primary
  proofOfPurchaseUrl?: string;
  proofOfPurchaseImage?: string; // Base64 image of receipt
  receiptVerificationStatus?: 'verified' | 'warning' | 'pending';
  
  // Social Data
  giftMessage?: string; // From donor to requester
  thankYouMessage?: string; // From requester to donor
  comments: Comment[];
}

export interface ForumReply {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface ForumThread {
  id: string;
  authorId: string;
  title: string;
  content: string;
  category: ForumCategory;
  createdAt: string;
  replies: ForumReply[];
  views: number;
  likes: string[]; // User IDs
}

export interface Notification {
  id: string;
  userId: string; // Recipient
  message: string;
  type: 'info' | 'success' | 'alert';
  isRead: boolean;
  createdAt: string;
  relatedRequestId?: string;
}

export interface NavItem {
  label: string;
  id: string;
  icon?: any;
}
