import { neon } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';
import { User, RequestItem, ForumThread, ForumReply, Notification } from '../types';

// Check for database URL
const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
const useNeon = !!dbUrl;

// Initialize Neon client if URL exists
const sql = useNeon ? neon(dbUrl!) : null;

// --- LOCAL STORAGE HELPERS (Fallback) ---
const LOCAL_KEYS = {
  USERS: 'buymethis_users',
  REQUESTS: 'buymethis_requests',
  THREADS: 'buymethis_threads',
  REPLIES: 'buymethis_replies',
  NOTIFICATIONS: 'buymethis_notifications',
  SESSION: 'buymethis_session'
};

const getLocal = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setLocal = (key: string, data: any[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- DB INTERFACE ---

export const db = {
  isNeon: useNeon,

  // --- AUTH ---
  async signUp(email: string, profileData: Partial<User>) {
    const id = uuidv4();
    const newUser: User = {
      id,
      displayName: profileData.displayName || 'New User',
      handle: profileData.handle || 'newuser',
      bio: profileData.bio || '',
      avatarUrl: profileData.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
      location: profileData.location || 'Unknown',
      trustScore: 50,
      badges: [],
      projects: [],
      hobbies: [],
      coordinates: undefined
    };

    if (useNeon && sql) {
        // Warning: This stores user data directly. In production, use a proper Auth provider.
        // We assume a 'users' table exists with a JSONB column 'data' for simplicity of this prototype,
        // OR standard columns. Let's use standard columns matching our schema.
        await sql`
            INSERT INTO profiles (id, display_name, handle, bio, avatar_url, location, trust_score, badges, projects, hobbies)
            VALUES (${id}, ${newUser.displayName}, ${newUser.handle}, ${newUser.bio}, ${newUser.avatarUrl}, ${newUser.location}, ${newUser.trustScore}, ${JSON.stringify(newUser.badges)}, ${newUser.projects}, ${newUser.hobbies})
        `;
        // Also simulate an auth entry if we were building a full backend, but here we just store the profile.
    } else {
        const users = getLocal<User>(LOCAL_KEYS.USERS);
        // Simple check if handle exists
        if (users.find(u => u.handle === newUser.handle)) throw new Error("Handle already taken");
        users.push(newUser);
        setLocal(LOCAL_KEYS.USERS, users);
    }
    
    // Auto-login
    this.setSession(id);
    return newUser;
  },

  async signIn(handleOrEmail: string) {
      // For this simple demo, we just look up by handle
      if (useNeon && sql) {
          const result = await sql`SELECT * FROM profiles WHERE handle = ${handleOrEmail} OR display_name = ${handleOrEmail} LIMIT 1`;
          if (result.length > 0) {
              const u = result[0];
              // Map snake_case to camelCase
              const user: User = {
                  id: u.id,
                  displayName: u.display_name,
                  handle: u.handle,
                  bio: u.bio,
                  avatarUrl: u.avatar_url,
                  location: u.location,
                  trustScore: u.trust_score,
                  badges: u.badges || [],
                  projects: u.projects || [],
                  hobbies: u.hobbies || [],
                  coordinates: undefined // Simplified
              };
              this.setSession(user.id);
              return user;
          }
          throw new Error("User not found");
      } else {
          const users = getLocal<User>(LOCAL_KEYS.USERS);
          const user = users.find(u => u.handle === handleOrEmail || u.displayName === handleOrEmail);
          if (user) {
              this.setSession(user.id);
              return user;
          }
          throw new Error("User not found");
      }
  },

  setSession(userId: string) {
      localStorage.setItem(LOCAL_KEYS.SESSION, userId);
  },

  getSessionId() {
      return localStorage.getItem(LOCAL_KEYS.SESSION);
  },

  signOut() {
      localStorage.removeItem(LOCAL_KEYS.SESSION);
  },

  async getUser(id: string): Promise<User | null> {
      if (useNeon && sql) {
          const result = await sql`SELECT * FROM profiles WHERE id = ${id}`;
          if (result.length === 0) return null;
          const u = result[0];
          return {
              id: u.id,
              displayName: u.display_name,
              handle: u.handle,
              bio: u.bio,
              avatarUrl: u.avatar_url,
              location: u.location,
              trustScore: u.trust_score,
              badges: u.badges || [],
              projects: u.projects || [],
              hobbies: u.hobbies || [],
              coordinates: u.coordinates_lat ? { lat: u.coordinates_lat, lng: u.coordinates_lng } : undefined
          };
      } else {
          return getLocal<User>(LOCAL_KEYS.USERS).find(u => u.id === id) || null;
      }
  },

  async getAllUsers(): Promise<User[]> {
      if (useNeon && sql) {
          const result = await sql`SELECT * FROM profiles`;
          return result.map(u => ({
              id: u.id,
              displayName: u.display_name,
              handle: u.handle,
              bio: u.bio,
              avatarUrl: u.avatar_url,
              location: u.location,
              trustScore: u.trust_score,
              badges: u.badges || [],
              projects: u.projects || [],
              hobbies: u.hobbies || [],
              coordinates: u.coordinates_lat ? { lat: u.coordinates_lat, lng: u.coordinates_lng } : undefined
          }));
      } else {
          return getLocal<User>(LOCAL_KEYS.USERS);
      }
  },

  async updateUser(user: User) {
      if (useNeon && sql) {
          await sql`
              UPDATE profiles SET 
              display_name = ${user.displayName},
              bio = ${user.bio},
              location = ${user.location},
              projects = ${user.projects},
              hobbies = ${user.hobbies},
              coordinates_lat = ${user.coordinates?.lat || null},
              coordinates_lng = ${user.coordinates?.lng || null}
              WHERE id = ${user.id}
          `;
      } else {
          const users = getLocal<User>(LOCAL_KEYS.USERS);
          const idx = users.findIndex(u => u.id === user.id);
          if (idx !== -1) {
              users[idx] = user;
              setLocal(LOCAL_KEYS.USERS, users);
          }
      }
  },

  // --- REQUESTS ---
  async getRequests(): Promise<RequestItem[]> {
      if (useNeon && sql) {
          const result = await sql`SELECT * FROM requests ORDER BY created_at DESC`;
          return result.map(r => ({
              id: r.id,
              requesterId: r.requester_id,
              title: r.title,
              reason: r.reason,
              category: r.category,
              status: r.status,
              location: r.location,
              createdAt: r.created_at,
              coordinates: r.coordinates_lat ? { lat: r.coordinates_lat, lng: r.coordinates_lng } : undefined,
              shippingAddress: r.shipping_address,
              fulfillerId: r.fulfiller_id,
              trackingNumber: r.tracking_number,
              proofOfPurchaseImage: r.proof_of_purchase_image,
              giftMessage: r.gift_message,
              thankYouMessage: r.thank_you_message,
              receiptVerificationStatus: r.receipt_verification_status,
              enrichedData: r.enriched_data,
              comments: r.comments || [],
              productUrl: ''
          }));
      } else {
          return getLocal<RequestItem>(LOCAL_KEYS.REQUESTS).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
  },

  async createRequest(req: RequestItem) {
      if (useNeon && sql) {
          await sql`
              INSERT INTO requests (id, requester_id, title, reason, category, status, location, created_at, coordinates_lat, coordinates_lng, shipping_address, enriched_data)
              VALUES (${req.id}, ${req.requesterId}, ${req.title}, ${req.reason}, ${req.category}, ${req.status}, ${req.location}, ${req.createdAt}, ${req.coordinates?.lat || null}, ${req.coordinates?.lng || null}, ${req.shippingAddress}, ${JSON.stringify(req.enrichedData)})
          `;
      } else {
          const requests = getLocal<RequestItem>(LOCAL_KEYS.REQUESTS);
          requests.push(req);
          setLocal(LOCAL_KEYS.REQUESTS, requests);
      }
  },

  async updateRequest(reqId: string, updates: Partial<RequestItem>) {
      if (useNeon && sql) {
          // Construct query dynamically or use individual checks
          // For simplicity in this demo, we handle specific fields
          if (updates.status) await sql`UPDATE requests SET status = ${updates.status} WHERE id = ${reqId}`;
          if (updates.fulfillerId) await sql`UPDATE requests SET fulfiller_id = ${updates.fulfillerId} WHERE id = ${reqId}`;
          if (updates.trackingNumber) await sql`UPDATE requests SET tracking_number = ${updates.trackingNumber} WHERE id = ${reqId}`;
          if (updates.comments) await sql`UPDATE requests SET comments = ${JSON.stringify(updates.comments)} WHERE id = ${reqId}`;
          if (updates.proofOfPurchaseImage) await sql`UPDATE requests SET proof_of_purchase_image = ${updates.proofOfPurchaseImage} WHERE id = ${reqId}`;
          if (updates.thankYouMessage) await sql`UPDATE requests SET thank_you_message = ${updates.thankYouMessage} WHERE id = ${reqId}`;
          if (updates.giftMessage) await sql`UPDATE requests SET gift_message = ${updates.giftMessage} WHERE id = ${reqId}`;
      } else {
          const requests = getLocal<RequestItem>(LOCAL_KEYS.REQUESTS);
          const idx = requests.findIndex(r => r.id === reqId);
          if (idx !== -1) {
              requests[idx] = { ...requests[idx], ...updates };
              setLocal(LOCAL_KEYS.REQUESTS, requests);
          }
      }
  },

  // --- FORUM ---
  async getThreads(): Promise<ForumThread[]> {
      if (useNeon && sql) {
         // Logic would require JOINing replies, simplified here
         const threads = await sql`SELECT * FROM forum_threads ORDER BY created_at DESC`;
         const replies = await sql`SELECT * FROM forum_replies ORDER BY created_at ASC`;
         
         return threads.map(t => ({
             id: t.id,
             authorId: t.author_id,
             title: t.title,
             content: t.content,
             category: t.category,
             createdAt: t.created_at,
             views: t.views,
             likes: t.likes || [],
             replies: replies.filter(r => r.thread_id === t.id).map(r => ({
                 id: r.id,
                 threadId: r.thread_id,
                 authorId: r.author_id,
                 content: r.content,
                 createdAt: r.created_at
             }))
         }));
      } else {
          const threads = getLocal<ForumThread>(LOCAL_KEYS.THREADS);
          const replies = getLocal<ForumReply>(LOCAL_KEYS.REPLIES);
          return threads.map(t => ({
              ...t,
              replies: replies.filter(r => r.threadId === t.id)
          })).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
  },

  async createThread(thread: ForumThread) {
       if (useNeon && sql) {
           await sql`
             INSERT INTO forum_threads (id, author_id, title, content, category, created_at, views, likes)
             VALUES (${thread.id}, ${thread.authorId}, ${thread.title}, ${thread.content}, ${thread.category}, ${thread.createdAt}, 0, '[]')
           `;
       } else {
           const threads = getLocal<ForumThread>(LOCAL_KEYS.THREADS);
           // Store replies separately to normalize
           threads.push({ ...thread, replies: [] });
           setLocal(LOCAL_KEYS.THREADS, threads);
       }
  },

  async createReply(reply: ForumReply) {
      if (useNeon && sql) {
          await sql`
            INSERT INTO forum_replies (id, thread_id, author_id, content, created_at)
            VALUES (${reply.id}, ${reply.threadId}, ${reply.authorId}, ${reply.content}, ${reply.createdAt})
          `;
      } else {
          const replies = getLocal<ForumReply>(LOCAL_KEYS.REPLIES);
          replies.push(reply);
          setLocal(LOCAL_KEYS.REPLIES, replies);
      }
  },

  // --- NOTIFICATIONS ---
  async getNotifications(userId: string): Promise<Notification[]> {
      if (useNeon && sql) {
          const result = await sql`SELECT * FROM notifications WHERE user_id = ${userId} ORDER BY created_at DESC`;
          return result.map(n => ({
              id: n.id,
              userId: n.user_id,
              message: n.message,
              type: n.type,
              isRead: n.is_read,
              createdAt: n.created_at,
              relatedRequestId: n.related_request_id
          }));
      } else {
          return getLocal<Notification>(LOCAL_KEYS.NOTIFICATIONS)
            .filter(n => n.userId === userId)
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
  },

  async createNotification(notif: Notification) {
      if (useNeon && sql) {
          await sql`
            INSERT INTO notifications (id, user_id, message, type, is_read, created_at, related_request_id)
            VALUES (${notif.id}, ${notif.userId}, ${notif.message}, ${notif.type}, ${notif.isRead}, ${notif.createdAt}, ${notif.relatedRequestId})
          `;
      } else {
          const notifs = getLocal<Notification>(LOCAL_KEYS.NOTIFICATIONS);
          notifs.push(notif);
          setLocal(LOCAL_KEYS.NOTIFICATIONS, notifs);
      }
  },
  
  async markNotificationsRead(userId: string) {
       if (useNeon && sql) {
           await sql`UPDATE notifications SET is_read = true WHERE user_id = ${userId}`;
       } else {
           const notifs = getLocal<Notification>(LOCAL_KEYS.NOTIFICATIONS);
           const updated = notifs.map(n => n.userId === userId ? { ...n, isRead: true } : n);
           setLocal(LOCAL_KEYS.NOTIFICATIONS, updated);
       }
  }
};

/**
 * Helper to upload images. 
 * Since Neon is just a DB, we will store the image as Base64.
 * In a real app, you would use AWS S3, Google Cloud Storage, or Vercel Blob.
 */
export const uploadImage = async (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            resolve(reader.result as string);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
};

export const base64ToFile = (base64: string, filename: string): File => {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};