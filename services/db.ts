
import { neon } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';
import { User, RequestItem, ForumThread, ForumReply, Notification, DeliveryPreference, RequestStatus } from '../types';

// Check for database URL
const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
const useNeon = !!dbUrl;

// Initialize Neon client if URL exists
const sql = useNeon ? neon(dbUrl!) : null;

// Helper to simulate image upload (returns base64)
export const uploadImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

// Simple hash function for demo purposes (using Web Crypto API)
const hashPassword = async (password: string) => {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// --- DB INTERFACE ---

export const db = {
  isNeon: useNeon,

  // --- AUTH ---
  async signUp(email: string, profileData: Partial<User> & { password?: string }) {
    // 1. Check for duplicate handle
    const targetHandle = profileData.handle || 'newuser';
    
    // Check local or remote for duplicates
    if (sql) {
        const existing = await sql`SELECT id FROM profiles WHERE handle = ${targetHandle}`;
        if (existing.length > 0) throw new Error("Handle already taken.");
    } else {
        const users = JSON.parse(localStorage.getItem('bm_users') || '{}');
        const handleExists = Object.values(users).some((u: any) => u.handle.toLowerCase() === targetHandle.toLowerCase());
        if (handleExists) throw new Error("Handle already taken.");
    }

    const id = uuidv4();
    const isAdmin = targetHandle.toLowerCase() === 'admin';

    const newUser: User = {
      id,
      displayName: profileData.displayName || 'New User',
      handle: targetHandle,
      bio: profileData.bio || '',
      avatarUrl: profileData.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
      bannerUrl: profileData.bannerUrl || `https://picsum.photos/seed/${id}_banner/1200/400`,
      location: profileData.location || 'Unknown',
      trustScore: isAdmin ? 100 : 50,
      badges: isAdmin ? [{ id: 'admin', label: 'Admin', icon: 'shield', description: 'System Admin', color: 'bg-red-600' }] : [],
      projects: [],
      hobbies: [],
      coordinates: undefined,
      isAdmin: isAdmin
    };

    const passwordHash = profileData.password ? await hashPassword(profileData.password) : null;

    if (sql) {
        await sql`
            INSERT INTO profiles (id, display_name, handle, bio, avatar_url, banner_url, location, password, trust_score, badges, projects, hobbies, is_admin)
            VALUES (${id}, ${newUser.displayName}, ${newUser.handle}, ${newUser.bio}, ${newUser.avatarUrl}, ${newUser.bannerUrl}, ${newUser.location}, ${passwordHash}, ${newUser.trustScore}, ${JSON.stringify(newUser.badges)}, ${newUser.projects}, ${newUser.hobbies}, ${newUser.isAdmin})
        `;
    } else {
        const users = JSON.parse(localStorage.getItem('bm_users') || '{}');
        users[id] = { ...newUser, password: passwordHash };
        localStorage.setItem('bm_users', JSON.stringify(users));
    }
    
    this.setSession(id);
    return newUser;
  },

  async signIn(handleOrEmail: string, password?: string) {
      if (sql) {
        const result = await sql`SELECT * FROM profiles WHERE handle = ${handleOrEmail} OR display_name = ${handleOrEmail} LIMIT 1`;
        if (result.length > 0) {
            const u = result[0];
            
            // Verify Password if one is stored and provided
            if (u.password && password) {
                const inputHash = await hashPassword(password);
                if (inputHash !== u.password) {
                    throw new Error("Invalid password");
                }
            } else if (u.password && !password) {
                throw new Error("Password required");
            }

            const user: User = {
                id: u.id,
                displayName: u.display_name,
                handle: u.handle,
                bio: u.bio,
                avatarUrl: u.avatar_url,
                bannerUrl: u.banner_url || `https://picsum.photos/seed/${u.id}_banner/1200/400`,
                location: u.location,
                trustScore: u.trust_score,
                badges: u.badges || [],
                projects: u.projects || [],
                hobbies: u.hobbies || [],
                coordinates: u.coordinates_lat ? { lat: u.coordinates_lat, lng: u.coordinates_lng } : undefined,
                isAdmin: u.is_admin
            };
            this.setSession(user.id);
            return user;
        }
      } else {
          const users = JSON.parse(localStorage.getItem('bm_users') || '{}');
          const userEntry = Object.values(users).find((u: any) => u.handle === handleOrEmail || u.displayName === handleOrEmail) as any;
          
          if (userEntry) {
              if (userEntry.password && password) {
                  const inputHash = await hashPassword(password);
                  if (inputHash !== userEntry.password) throw new Error("Invalid password");
              }
              
              const user: User = {
                  id: userEntry.id,
                  displayName: userEntry.displayName,
                  handle: userEntry.handle,
                  bio: userEntry.bio,
                  avatarUrl: userEntry.avatarUrl,
                  bannerUrl: userEntry.bannerUrl,
                  location: userEntry.location,
                  trustScore: userEntry.trustScore,
                  badges: userEntry.badges,
                  projects: userEntry.projects,
                  hobbies: userEntry.hobbies,
                  coordinates: userEntry.coordinates,
                  isAdmin: userEntry.isAdmin
              };

              this.setSession(user.id);
              return user;
          }
      }
      throw new Error("User not found");
  },

  setSession(userId: string) {
      localStorage.setItem('buymethis_session', userId);
  },

  getSessionId() {
      return localStorage.getItem('buymethis_session');
  },

  signOut() {
      localStorage.removeItem('buymethis_session');
  },

  async getUser(id: string): Promise<User | null> {
      if (sql) {
        try {
            const result = await sql`SELECT * FROM profiles WHERE id = ${id}`;
            if (result.length === 0) return null;
            const u = result[0];
            return {
                id: u.id,
                displayName: u.display_name,
                handle: u.handle,
                bio: u.bio,
                avatarUrl: u.avatar_url,
                bannerUrl: u.banner_url,
                location: u.location,
                trustScore: u.trust_score,
                badges: u.badges || [],
                projects: u.projects || [],
                hobbies: u.hobbies || [],
                coordinates: u.coordinates_lat ? { lat: u.coordinates_lat, lng: u.coordinates_lng } : undefined,
                isAdmin: u.is_admin
            };
        } catch (e) {
            console.error("DB Error", e);
            return null;
        }
      } else {
          const users = JSON.parse(localStorage.getItem('bm_users') || '{}');
          return users[id] || null;
      }
  },

  async getAllUsers(): Promise<User[]> {
      if (sql) {
          const result = await sql`SELECT * FROM profiles`;
          return result.map(u => ({
            id: u.id,
            displayName: u.display_name,
            handle: u.handle,
            bio: u.bio,
            avatarUrl: u.avatar_url,
            bannerUrl: u.banner_url,
            location: u.location,
            trustScore: u.trust_score,
            badges: u.badges || [],
            projects: u.projects || [],
            hobbies: u.hobbies || [],
            coordinates: u.coordinates_lat ? { lat: u.coordinates_lat, lng: u.coordinates_lng } : undefined,
            isAdmin: u.is_admin
          }));
      } else {
          const users = JSON.parse(localStorage.getItem('bm_users') || '{}');
          return Object.values(users);
      }
  },

  async updateUser(user: User) {
      if (sql) {
          await sql`
            UPDATE profiles SET 
                display_name = ${user.displayName},
                bio = ${user.bio},
                location = ${user.location},
                avatar_url = ${user.avatarUrl},
                banner_url = ${user.bannerUrl},
                projects = ${user.projects},
                hobbies = ${user.hobbies},
                coordinates_lat = ${user.coordinates?.lat || null},
                coordinates_lng = ${user.coordinates?.lng || null}
            WHERE id = ${user.id}
          `;
      } else {
          const users = JSON.parse(localStorage.getItem('bm_users') || '{}');
          users[user.id] = { ...users[user.id], ...user }; // Merge to preserve password
          localStorage.setItem('bm_users', JSON.stringify(users));
      }
  },

  // --- REQUESTS ---

  async getRequests(): Promise<RequestItem[]> {
      if (sql) {
          const result = await sql`SELECT * FROM requests ORDER BY created_at DESC`;
          return result.map(r => ({
              id: r.id,
              requesterId: r.requester_id,
              title: r.title,
              reason: r.reason,
              category: r.category,
              deliveryPreference: r.delivery_preference,
              status: r.status,
              location: r.location,
              createdAt: r.created_at,
              shippingAddress: r.shipping_address,
              fulfillerId: r.fulfiller_id,
              trackingNumber: r.tracking_number,
              proofOfPurchaseImage: r.proof_of_purchase_image,
              giftMessage: r.gift_message,
              thankYouMessage: r.thank_you_message,
              receiptVerificationStatus: r.receipt_verification_status,
              enrichedData: r.enriched_data,
              candidates: r.candidates || [],
              comments: r.comments || [],
              fulfillments: r.fulfillments || [],
              coordinates: r.coordinates_lat ? { lat: r.coordinates_lat, lng: r.coordinates_lng } : undefined
          }));
      } else {
          const requests = JSON.parse(localStorage.getItem('bm_requests') || '[]');
          return requests.map((r: RequestItem) => ({
             ...r,
             fulfillments: r.fulfillments || [] // Ensure array exists for legacy local data
          }));
      }
  },

  async createRequest(req: RequestItem) {
      if (sql) {
          await sql`
            INSERT INTO requests (
                id, requester_id, title, reason, category, delivery_preference, status, location, created_at, 
                shipping_address, enriched_data, candidates, comments, fulfillments, coordinates_lat, coordinates_lng
            ) VALUES (
                ${req.id}, ${req.requesterId}, ${req.title}, ${req.reason}, ${req.category}, ${req.deliveryPreference}, ${req.status}, ${req.location}, ${req.createdAt},
                ${req.shippingAddress}, ${JSON.stringify(req.enrichedData)}, ${req.candidates}, ${JSON.stringify(req.comments)}, ${JSON.stringify(req.fulfillments)}, ${req.coordinates?.lat || null}, ${req.coordinates?.lng || null}
            )
          `;
      } else {
          const requests = JSON.parse(localStorage.getItem('bm_requests') || '[]');
          requests.unshift(req);
          localStorage.setItem('bm_requests', JSON.stringify(requests));
      }
  },

  async updateRequest(id: string, updates: Partial<RequestItem>) {
      if (sql) {
          // Construct query dynamically for simplicity in this demo
          if (updates.status) await sql`UPDATE requests SET status = ${updates.status} WHERE id = ${id}`;
          if (updates.candidates) await sql`UPDATE requests SET candidates = ${updates.candidates} WHERE id = ${id}`;
          if (updates.fulfillerId) await sql`UPDATE requests SET fulfiller_id = ${updates.fulfillerId} WHERE id = ${id}`;
          if (updates.trackingNumber) await sql`UPDATE requests SET tracking_number = ${updates.trackingNumber} WHERE id = ${id}`;
          if (updates.proofOfPurchaseImage) await sql`UPDATE requests SET proof_of_purchase_image = ${updates.proofOfPurchaseImage} WHERE id = ${id}`;
          if (updates.giftMessage) await sql`UPDATE requests SET gift_message = ${updates.giftMessage} WHERE id = ${id}`;
          if (updates.thankYouMessage) await sql`UPDATE requests SET thank_you_message = ${updates.thankYouMessage} WHERE id = ${id}`;
          if (updates.receiptVerificationStatus) await sql`UPDATE requests SET receipt_verification_status = ${updates.receiptVerificationStatus} WHERE id = ${id}`;
          if (updates.comments) await sql`UPDATE requests SET comments = ${JSON.stringify(updates.comments)} WHERE id = ${id}`;
          if (updates.fulfillments) await sql`UPDATE requests SET fulfillments = ${JSON.stringify(updates.fulfillments)} WHERE id = ${id}`;
          if (updates.createdAt) await sql`UPDATE requests SET created_at = ${updates.createdAt} WHERE id = ${id}`;
      } else {
          const requests = JSON.parse(localStorage.getItem('bm_requests') || '[]') as RequestItem[];
          const idx = requests.findIndex(r => r.id === id);
          if (idx !== -1) {
              requests[idx] = { ...requests[idx], ...updates };
              localStorage.setItem('bm_requests', JSON.stringify(requests));
          }
      }
  },

  async deleteRequest(id: string) {
      if (sql) {
          await sql`DELETE FROM requests WHERE id = ${id}`;
      } else {
          let requests = JSON.parse(localStorage.getItem('bm_requests') || '[]') as RequestItem[];
          requests = requests.filter(r => r.id !== id);
          localStorage.setItem('bm_requests', JSON.stringify(requests));
      }
  },

  // --- FORUM ---

  async getThreads(): Promise<ForumThread[]> {
      if (sql) {
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
              replies: replies.filter((r: any) => r.thread_id === t.id).map((r: any) => ({
                  id: r.id,
                  threadId: r.thread_id,
                  authorId: r.author_id,
                  title: r.title,
                  content: r.content,
                  createdAt: r.created_at
              }))
          }));
      } else {
          return JSON.parse(localStorage.getItem('bm_threads') || '[]');
      }
  },

  async createThread(thread: ForumThread) {
      if (sql) {
          await sql`
            INSERT INTO forum_threads (id, author_id, title, content, category, created_at, views, likes)
            VALUES (${thread.id}, ${thread.authorId}, ${thread.title}, ${thread.content}, ${thread.category}, ${thread.createdAt}, ${thread.views}, ${thread.likes})
          `;
      } else {
          const threads = JSON.parse(localStorage.getItem('bm_threads') || '[]');
          threads.unshift(thread);
          localStorage.setItem('bm_threads', JSON.stringify(threads));
      }
  },

  async createReply(reply: ForumReply) {
      if (sql) {
          await sql`
            INSERT INTO forum_replies (id, thread_id, author_id, title, content, created_at)
            VALUES (${reply.id}, ${reply.threadId}, ${reply.authorId}, ${reply.title}, ${reply.content}, ${reply.createdAt})
          `;
      } else {
          const threads = JSON.parse(localStorage.getItem('bm_threads') || '[]') as ForumThread[];
          const thread = threads.find(t => t.id === reply.threadId);
          if (thread) {
              thread.replies.push(reply);
              localStorage.setItem('bm_threads', JSON.stringify(threads));
          }
      }
  },

  // --- NOTIFICATIONS ---

  async getNotifications(userId: string): Promise<Notification[]> {
      if (sql) {
          const res = await sql`SELECT * FROM notifications WHERE user_id = ${userId} ORDER BY created_at DESC`;
          return res.map(n => ({
              id: n.id,
              userId: n.user_id,
              message: n.message,
              type: n.type,
              isRead: n.is_read,
              createdAt: n.created_at,
              relatedRequestId: n.related_request_id
          }));
      } else {
          const all = JSON.parse(localStorage.getItem('bm_notifications') || '[]') as Notification[];
          return all.filter(n => n.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
  },

  async createNotification(notif: Notification) {
      if (sql) {
          await sql`
            INSERT INTO notifications (id, user_id, message, type, is_read, created_at, related_request_id)
            VALUES (${notif.id}, ${notif.userId}, ${notif.message}, ${notif.type}, ${notif.isRead}, ${notif.createdAt}, ${notif.relatedRequestId})
          `;
      } else {
          const all = JSON.parse(localStorage.getItem('bm_notifications') || '[]');
          all.unshift(notif);
          localStorage.setItem('bm_notifications', JSON.stringify(all));
      }
  },

  async markNotificationsRead(userId: string) {
      if (sql) {
          await sql`UPDATE notifications SET is_read = true WHERE user_id = ${userId}`;
      } else {
          const all = JSON.parse(localStorage.getItem('bm_notifications') || '[]') as Notification[];
          const updated = all.map(n => n.userId === userId ? { ...n, isRead: true } : n);
          localStorage.setItem('bm_notifications', JSON.stringify(updated));
      }
  }
};