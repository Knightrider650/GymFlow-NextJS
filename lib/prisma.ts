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

// Helper to read fallback JSON database (tries primary, then fallback on /tmp)
function getJsonData() {
  const primaryPath = path.join(process.cwd(), 'server', 'data.json')
  const fallbackPath = process.env.GYMFLOW_JSON_DB_FILE || '/tmp/gymflow-data.json'
  
  // Try primary path first
  try {
    if (fs.existsSync(primaryPath)) {
      return JSON.parse(fs.readFileSync(primaryPath, 'utf-8'))
    }
  } catch (err) {
    console.warn('Failed to read primary JSON database:', err)
  }
  
  // Try fallback path
  try {
    if (fs.existsSync(fallbackPath)) {
      console.log(`✓ Reading from fallback database: ${fallbackPath}`)
      return JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'))
    }
  } catch (err) {
    console.warn('Failed to read fallback JSON database:', err)
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
    let itemVal = item[key] !== undefined ? item[key] : item[toSnakeCase(key)];
    
    // Fallback for gymId / gym_id to tenantId / tenant_id
    if (itemVal === undefined && (key === 'gymId' || key === 'gym_id')) {
      itemVal = item['tenantId'] !== undefined ? item['tenantId'] : item['tenant_id'];
    }
    
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

function normalizeGymId(item: any): any {
  if (!item || typeof item !== 'object') return item;
  if (Array.isArray(item)) {
    return item.map(normalizeGymId);
  }
  const gymId = item.gymId || item.gym_id || item.tenantId || item.tenant_id;
  if (gymId !== undefined) {
    return {
      ...item,
      gymId,
      gym_id: gymId,
      tenantId: gymId,
      tenant_id: gymId
    };
  }
  return item;
}

const MODEL_MAPPING: Record<string, string> = {
  gym: 'tenants',
  plan: 'plans',
  member: 'members',
  user: 'users',
  attendance: 'attendance',
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

// Helper to save fallback JSON database (with Vercel/serverless fallback to /tmp)
function saveJsonData(data: any) {
  const primaryPath = path.join(process.cwd(), 'server', 'data.json')
  const fallbackPath = process.env.GYMFLOW_JSON_DB_FILE || '/tmp/gymflow-data.json'
  
  try {
    fs.writeFileSync(primaryPath, JSON.stringify(data, null, 2), 'utf-8')
    return
  } catch (err: any) {
    // Check for read-only filesystem errors
    if (err.code === 'EROFS' || err.code === 'EPERM') {
      try {
        // Ensure /tmp directory exists
        const dir = path.dirname(fallbackPath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        fs.writeFileSync(fallbackPath, JSON.stringify(data, null, 2), 'utf-8')
        console.log(`✓ Saved to fallback database: ${fallbackPath}`)
        return
      } catch (fallbackErr) {
        console.error('Failed to write to both primary and fallback JSON databases:', fallbackErr)
      }
    } else {
      console.error('Failed to write to fallback JSON database:', err)
    }
  }
}

// Wrap prismaInstance in a Proxy to fallback gracefully to JSON database on query failures
const prisma = new Proxy(prismaInstance, {
  get(target, prop) {
    const modelName = prop as string;
    const jsonKey = MODEL_MAPPING[modelName];

    if (prop === '$transaction') {
      return async function (arg: any) {
        try {
          if (typeof target.$transaction === 'function') {
            return await target.$transaction(arg);
          }
        } catch (dbError: any) {
          console.warn("Prisma transaction failed, falling back to simulated transaction:", dbError.message);
        }

        if (typeof arg === 'function') {
          return await arg(prisma);
        } else if (Array.isArray(arg)) {
          return await Promise.all(arg);
        }
        return null;
      };
    }

    if (prop === '$connect' || prop === '$disconnect') {
      return typeof (target as any)[prop] === 'function'
        ? (target as any)[prop]
        : async () => {};
    }

    if (jsonKey) {
      const modelTarget = (target as any)[prop] || {};
      return new Proxy(modelTarget, {
        get(mTarget, methodProp) {
          const methodName = methodProp as string;
          const originalMethod = typeof mTarget[methodProp] === 'function' ? mTarget[methodProp] : null;

          return async function (...args: any[]) {
            try {
              if (originalMethod) {
                return await originalMethod.apply(mTarget, args);
              }
              throw new Error(`Method ${methodName} not implemented on model ${modelName} (fallback mode)`);
            } catch (dbError: any) {
              console.warn(`Prisma query fallback on ${modelName}.${methodName}:`, dbError.message);

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
                return normalizeGymId(filtered);
              }

              if (methodName === 'findFirst' || methodName === 'findUnique') {
                return normalizeGymId(items.find((item: any) => matchesFilter(item, where)) || null);
              }

              if (methodName === 'count') {
                return items.filter((item: any) => matchesFilter(item, where)).length;
              }

              if (methodName === 'create') {
                const data = args[0]?.data || {};
                const newItem = normalizeGymId({
                  id: data.id || Math.random().toString(),
                  ...data,
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
                if (!jsonData[jsonKey]) jsonData[jsonKey] = [];
                jsonData[jsonKey].push(newItem);
                saveJsonData(jsonData);
                return newItem;
              }

              if (methodName === 'update' || methodName === 'updateMany') {
                const data = args[0]?.data || {};
                const updatedItems: any[] = [];
                let matchFound = false;
                const newItems = items.map((item: any) => {
                  if (matchesFilter(item, where)) {
                    matchFound = true;
                    const updated = normalizeGymId({ ...item, ...data, updatedAt: new Date() });
                    updatedItems.push(updated);
                    return updated;
                  }
                  return item;
                });

                if (matchFound) {
                  jsonData[jsonKey] = newItems;
                  saveJsonData(jsonData);
                  return methodName === 'update' ? updatedItems[0] : { count: updatedItems.length };
                }

                return methodName === 'update'
                  ? normalizeGymId({ ...data, id: where?.id || 'unknown', updatedAt: new Date() })
                  : { count: 0 };
              }

              if (methodName === 'delete' || methodName === 'deleteMany') {
                const deletedItems: any[] = [];
                const remainingItems = items.filter((item: any) => {
                  if (matchesFilter(item, where)) {
                    deletedItems.push(item);
                    return false;
                  }
                  return true;
                });

                if (deletedItems.length > 0) {
                  jsonData[jsonKey] = remainingItems;
                  saveJsonData(jsonData);
                  return methodName === 'delete' ? normalizeGymId(deletedItems[0]) : { count: deletedItems.length };
                }

                return methodName === 'delete' ? normalizeGymId({ id: 'deleted' }) : { count: 0 };
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
