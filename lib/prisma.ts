import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import fs from 'fs'
import path from 'path'

declare global {
  namespace NodeJS {
    interface Global {
      prisma: PrismaClient;
    }
  }
}

let prismaInstance: PrismaClient;

try {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }

  const rawUrl = process.env.DATABASE_URL;
  const connectionString = rawUrl ? rawUrl.replace(/sslmode=(require|prefer|verify-ca)/g, 'sslmode=verify-full') : undefined;
  const adapter = new PrismaPg({ connectionString: connectionString! })
  prismaInstance = (global as any).prisma || new PrismaClient({ adapter });
} catch (e) {
  console.warn("Prisma failed to initialize at module level (expected during build). Using dummy client.");
  prismaInstance = {} as PrismaClient;
}

if (process.env.NODE_ENV !== "production") (global as any).prisma = prismaInstance;

// Helper to read fallback JSON database
function getJsonData() {
  try {
    const filePath = path.join(process.cwd(), 'server', 'data.json')
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }
  } catch (err) {
    console.error('Failed to read fallback JSON database:', err)
  }
  return {}
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function matchesFilter(item: any, where: any): boolean {
  if (!where) return true;
  for (const [key, value] of Object.entries(where)) {
    // Check key in item, falling back to snake_case equivalent
    const itemVal = item[key] !== undefined ? item[key] : item[toSnakeCase(key)];
    
    if (value && typeof value === 'object') {
      const valAny = value as any;
      if ('equals' in valAny) {
        if (itemVal !== valAny.equals) return false;
      }
      if ('in' in valAny && Array.isArray(valAny.in)) {
        if (!valAny.in.includes(itemVal)) return false;
      }
      if ('gte' in valAny) {
        if (!itemVal || itemVal < valAny.gte) return false;
      }
      if ('lte' in valAny) {
        if (!itemVal || itemVal > valAny.lte) return false;
      }
    } else {
      if (itemVal !== value) return false;
    }
  }
  return true;
}

const MODEL_MAPPING: Record<string, string> = {
  gym: 'tenants',
  plan: 'plans',
  member: 'members',
  user: 'users',
  fitnessClass: 'classes',
  inventoryItem: 'inventory',
  staff: 'staff',
  invoice: 'billing',
  payment: 'payments',
  lead: 'leads',
  notification: 'notifications',
  activityLog: 'activity_logs',
  feedback: 'feedback',
  invite: 'invites',
  branch: 'branches',
  campaign: 'campaigns',
  reminder: 'reminders'
}

// Wrap prismaInstance in a Proxy to fallback gracefully to JSON database on query failures
const prisma = new Proxy(prismaInstance, {
  get(target, prop) {
    const modelName = prop as string;
    const jsonKey = MODEL_MAPPING[modelName];
    
    if (jsonKey && (target as any)[prop]) {
      return new Proxy((target as any)[prop], {
        get(modelTarget, methodProp) {
          const methodName = methodProp as string;
          const originalMethod = modelTarget[methodProp];
          
          if (typeof originalMethod !== 'function') {
            return originalMethod;
          }
          
          return async function (...args: any[]) {
            try {
              return await originalMethod.apply(modelTarget, args);
            } catch (dbError: any) {
              console.warn(`Prisma query failed on ${modelName}.${methodName}, falling back to local JSON database:`, dbError.message);
              
              const jsonData = getJsonData();
              const items = jsonData[jsonKey] || [];
              const where = args[0]?.where;
              
              if (methodName === 'findMany') {
                let filtered = items.filter((item: any) => matchesFilter(item, where));
                const orderBy = args[0]?.orderBy;
                if (orderBy) {
                  const entries = Object.entries(orderBy);
                  if (entries.length > 0) {
                    const [field, direction] = entries[0] as [string, any];
                    filtered.sort((a: any, b: any) => {
                      const valA = a[field] ?? '';
                      const valB = b[field] ?? '';
                      return direction === 'asc' 
                        ? String(valA).localeCompare(String(valB))
                        : String(valB).localeCompare(String(valA));
                    });
                  }
                }
                const take = args[0]?.take;
                if (typeof take === 'number') {
                  filtered = filtered.slice(0, take);
                }
                return filtered;
              }
              
              if (methodName === 'findFirst' || methodName === 'findUnique') {
                return items.find((item: any) => matchesFilter(item, where)) || null;
              }
              
              if (methodName === 'count') {
                return items.filter((item: any) => matchesFilter(item, where)).length;
              }
              
              if (methodName === 'create') {
                const data = args[0]?.data || {};
                return { id: Math.random().toString(), ...data, createdAt: new Date(), updatedAt: new Date() };
              }
              
              if (methodName === 'update' || methodName === 'updateMany') {
                const data = args[0]?.data || {};
                const match = items.find((item: any) => matchesFilter(item, where)) || {};
                return { ...match, ...data, updatedAt: new Date() };
              }
              
              if (methodName === 'delete' || methodName === 'deleteMany') {
                return items.find((item: any) => matchesFilter(item, where)) || { id: 'deleted' };
              }
              
              if (methodName === 'aggregate') {
                const sumField = args[0]?._sum;
                if (sumField) {
                  const field = Object.keys(sumField)[0];
                  const sumValue = items
                    .filter((item: any) => matchesFilter(item, where))
                    .reduce((acc: number, item: any) => acc + Number(item[field] || 0), 0);
                  return { _sum: { [field]: sumValue } };
                }
                return { _sum: {} };
              }
              
              throw dbError;
            }
          };
        }
      });
    }
    
    return (target as any)[prop];
  }
});

export default prisma;
