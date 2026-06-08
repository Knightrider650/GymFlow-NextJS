import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

declare global {
  namespace NodeJS {
    interface Global {
      prisma: PrismaClient;
    }
  }
}

let prismaInstance: PrismaClient | null = null;

function getPrismaInstance(): PrismaClient {
  if (prismaInstance) return prismaInstance;

  // Initialize PrismaClient with SQLite fallback.
  // If DATABASE_URL points to a file (SQLite), we create a plain PrismaClient.
  // Otherwise we use the PostgreSQL adapter.
  const rawUrl = process.env.DATABASE_URL || 'file:./dev.db';
  if (rawUrl.startsWith('file:')) {
    // SQLite connection, no adapter needed
    prismaInstance = (global as any).prisma || new PrismaClient();
  } else {
    // Native PostgreSQL connection
    prismaInstance = (global as any).prisma || new PrismaClient();
  }

  if (process.env.NODE_ENV !== "production") (global as any).prisma = prismaInstance;
  return prismaInstance!;
}

// Helper to read fallback JSON database (tries primary, then fallback on /tmp)
function getJsonData() {
  const primaryPath = path.join(process.cwd(), 'server', 'data.json')
  const fallbackPath = process.env.GYMFLOW_JSON_DB_FILE || '/tmp/gymflow-data.json'
  
  // Try fallback path first (where we write updates)
  try {
    if (fs.existsSync(fallbackPath)) {
      return JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'))
    }
  } catch (err) {
    console.warn('Failed to read fallback JSON database:', err)
  }
  
  // Try primary path as template fallback
  try {
    if (fs.existsSync(primaryPath)) {
      return JSON.parse(fs.readFileSync(primaryPath, 'utf-8'))
    }
  } catch (err) {
    console.warn('Failed to read primary JSON database:', err)
  }
  
  return {}
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function matchesFilter(item: any, where: any): boolean {
  if (!where) return true;
  for (const [key, value] of Object.entries(where)) {
    // Support OR queries
    if (key === 'OR' && Array.isArray(value)) {
      const matchedAny = value.some((subFilter: any) => matchesFilter(item, subFilter));
      if (!matchedAny) return false;
      continue;
    }

    // Check key in item, falling back to snake_case equivalent
    let itemVal = item[key] !== undefined ? item[key] : item[toSnakeCase(key)];
    
    // Fallback for gymId / gym_id to tenantId / tenant_id
    if (itemVal === undefined && (key === 'gymId' || key === 'gym_id')) {
      itemVal = item['tenantId'] !== undefined ? item['tenantId'] : item['tenant_id'];
    }
    
    // Relation filter support (e.g. member: { gymId: ... })
    if (value && typeof value === 'object' && !('equals' in value || 'in' in value || 'gte' in value || 'lte' in value || 'contains' in value || 'mode' in value)) {
      let relationItems: any[] = [];
      let foreignKey = '';
      if (key === 'member') {
        relationItems = getJsonData().members || [];
        foreignKey = 'memberId';
      }
      if (relationItems.length > 0) {
        const foreignKeyValue = item[foreignKey] || item[toSnakeCase(foreignKey)];
        const relatedItem = relationItems.find((r: any) => r.id === foreignKeyValue);
        if (!relatedItem || !matchesFilter(relatedItem, value)) {
          return false;
        }
        continue;
      }
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
        if (!itemVal) return false;
        const itemDate = itemVal instanceof Date ? itemVal : new Date(itemVal);
        const filterDate = valAny.gte instanceof Date ? valAny.gte : new Date(valAny.gte);
        if (isNaN(itemDate.getTime()) || itemDate < filterDate) return false;
      }
      if ('lte' in valAny) {
        if (!itemVal) return false;
        const itemDate = itemVal instanceof Date ? itemVal : new Date(itemVal);
        const filterDate = valAny.lte instanceof Date ? valAny.lte : new Date(valAny.lte);
        if (isNaN(itemDate.getTime()) || itemDate > filterDate) return false;
      }
      if ('contains' in valAny) {
        const needle = String(valAny.contains);
        const haystack = String(itemVal || '');
        if (valAny.mode === 'insensitive') {
          if (!haystack.toLowerCase().includes(needle.toLowerCase())) return false;
        } else {
          if (!haystack.includes(needle)) return false;
        }
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
  
  let normalized = { ...item };
  
  // Normalize gymId / tenantId equivalents
  const gymId = item.gymId || item.gym_id || item.tenantId || item.tenant_id;
  if (gymId !== undefined) {
    normalized.gymId = gymId;
    normalized.gym_id = gymId;
    normalized.tenantId = gymId;
    normalized.tenant_id = gymId;
  }

  // Normalize password / password_hash for users
  const pwd = item.password || item.password_hash;
  if (pwd !== undefined) {
    normalized.password = pwd;
    normalized.password_hash = pwd;
  }

  // Normalize fullname / name for users/members/staff
  const fullname = item.fullname || item.name;
  if (fullname !== undefined) {
    normalized.fullname = fullname;
    normalized.name = fullname;
  }

  return normalized;
}

function resolveRelations(modelName: string, itemOrItems: any, include: any, jsonData: any): any {
  if (!itemOrItems || !include) return itemOrItems;

  if (Array.isArray(itemOrItems)) {
    return itemOrItems.map(item => resolveRelations(modelName, item, include, jsonData));
  }

  const item = { ...itemOrItems };

  for (const [relationKey, relationValue] of Object.entries(include)) {
    if (!relationValue) continue;

    // Determine target entity type and foreign keys
    let targetJsonKey: string | undefined;
    let foreignKeyField: string | undefined;
    let isMany = false;

    if (modelName === 'attendance' && relationKey === 'member') {
      targetJsonKey = 'members';
      foreignKeyField = 'memberId';
    } else if (modelName === 'invoice' && relationKey === 'member') {
      targetJsonKey = 'members';
      foreignKeyField = 'memberId';
    } else if (modelName === 'member' && relationKey === 'gym') {
      targetJsonKey = 'tenants';
      foreignKeyField = 'gymId';
    } else if (modelName === 'user' && relationKey === 'gym') {
      targetJsonKey = 'tenants';
      foreignKeyField = 'gymId';
    } else if (modelName === 'plan' && relationKey === 'gym') {
      targetJsonKey = 'tenants';
      foreignKeyField = 'gymId';
    } else if (modelName === 'member' && relationKey === 'plan') {
      targetJsonKey = 'plans';
      foreignKeyField = 'planId';
    } else if (modelName === 'gym' && relationKey === 'members') {
      targetJsonKey = 'members';
      isMany = true;
    } else if (modelName === 'gym' && relationKey === 'invoices') {
      targetJsonKey = 'billing';
      isMany = true;
    } else if (modelName === 'member' && relationKey === 'attendance') {
      targetJsonKey = 'attendance';
      isMany = true;
    } else if (modelName === 'member' && relationKey === 'invoices') {
      targetJsonKey = 'billing';
      isMany = true;
    } else if (modelName === 'invoice' && relationKey === 'payments') {
      targetJsonKey = 'payments';
      isMany = true;
    } else if (modelName === 'gym' && relationKey === '_count') {
      const select = (relationValue as any).select || {};
      const counts: any = {};
      for (const [countKey, countVal] of Object.entries(select)) {
        if (countVal) {
          const rawKey = countKey.replace(/s$/, '');
          const targetKey = MODEL_MAPPING[rawKey] || countKey;
          const targetItems = jsonData[targetKey] || [];
          counts[countKey] = targetItems.filter((t: any) => {
            const val = t.gymId || t.gym_id || t.tenantId || t.tenant_id;
            return val === item.id;
          }).length;
        }
      }
      item['_count'] = counts;
      continue;
    }

    if (!targetJsonKey) continue;

    const targetItems = jsonData[targetJsonKey] || [];

    if (isMany) {
      let matchField = 'memberId';
      if (modelName === 'gym') matchField = 'gymId';
      if (modelName === 'invoice') matchField = 'invoiceId';

      const related = targetItems.filter((t: any) => {
        const val = t[matchField] || t[toSnakeCase(matchField)] || t['gym_id'] || t['tenantId'] || t['tenant_id'];
        return val === item.id;
      });
      item[relationKey] = normalizeGymId(related);
    } else {
      const foreignKeyValue = item[foreignKeyField!] || item[toSnakeCase(foreignKeyField!)];
      let related = targetItems.find((t: any) => t.id === foreignKeyValue) || null;

      if (related) {
        related = normalizeGymId(related);
        if (typeof relationValue === 'object' && (relationValue as any).select) {
          const selectFields = (relationValue as any).select;
          const filteredRelated: any = {};
          for (const [sf, sv] of Object.entries(selectFields)) {
            if (sv) {
              filteredRelated[sf] = related[sf];
            }
          }
          related = filteredRelated;
        }
      }
      item[relationKey] = related;
    }
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
  reminder: 'reminders',
  expense: 'expenses'
}

// Helper to save fallback JSON database (with Vercel/serverless fallback to /tmp)
function saveJsonData(data: any) {
  const primaryPath = path.join(process.cwd(), 'server', 'data.json')
  const fallbackPath = process.env.GYMFLOW_JSON_DB_FILE || '/tmp/gymflow-data.json'
  
  try {
    fs.writeFileSync(primaryPath, JSON.stringify(data, null, 2), 'utf-8')
    return
  } catch (err: any) {
    try {
      // Ensure /tmp directory exists
      const dir = path.dirname(fallbackPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(fallbackPath, JSON.stringify(data, null, 2), 'utf-8')
      console.log(`✓ Saved to fallback database: ${fallbackPath} (due to write error: ${err.message})`)
      return
    } catch (fallbackErr) {
      console.error('Failed to write to both primary and fallback JSON databases:', fallbackErr)
    }
  }
}

// Wrap prismaInstance in a Proxy to fallback gracefully to JSON database on query failures
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    let instance: any;
    try {
      instance = getPrismaInstance();
    } catch (e) {
      instance = {};
    }

    const modelName = prop as string;
    const jsonKey = MODEL_MAPPING[modelName];

    if (prop === '$transaction') {
      return async function (arg: any) {
        try {
          if (typeof instance.$transaction === 'function') {
            return await instance.$transaction(arg);
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
      return typeof (instance as any)[prop] === 'function'
        ? (instance as any)[prop]
        : async () => {};
    }

    if (jsonKey) {
      const modelTarget = (instance as any)[prop] || {};
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
                const normalized = normalizeGymId(filtered);
                return resolveRelations(modelName, normalized, args[0]?.include, jsonData);
              }

              if (methodName === 'findFirst' || methodName === 'findUnique') {
                const item = items.find((item: any) => matchesFilter(item, where)) || null;
                const normalized = normalizeGymId(item);
                return resolveRelations(modelName, normalized, args[0]?.include, jsonData);
              }

              if (methodName === 'upsert') {
                const item = items.find((item: any) => matchesFilter(item, where)) || null;
                if (item) {
                  const updateData = args[0]?.update || {};
                  const updated = normalizeGymId({ ...item, ...updateData, updatedAt: new Date() });
                  const newItems = items.map((t: any) => (t.id === item.id ? updated : t));
                  jsonData[jsonKey] = newItems;
                  saveJsonData(jsonData);
                  return resolveRelations(modelName, updated, args[0]?.include, jsonData);
                } else {
                  const createData = args[0]?.create || {};
                  const newItem = normalizeGymId({
                    id: createData.id || Math.random().toString(),
                    ...createData,
                    timestamp: createData.timestamp || new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                  });
                  if (!jsonData[jsonKey]) jsonData[jsonKey] = [];
                  jsonData[jsonKey].push(newItem);
                  saveJsonData(jsonData);
                  return resolveRelations(modelName, newItem, args[0]?.include, jsonData);
                }
              }

              if (methodName === 'count') {
                return items.filter((item: any) => matchesFilter(item, where)).length;
              }

              if (methodName === 'create') {
                const data = args[0]?.data || {};
                const newItem = normalizeGymId({
                  id: data.id || Math.random().toString(),
                  ...data,
                  timestamp: data.timestamp || new Date(),
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
                if (!jsonData[jsonKey]) jsonData[jsonKey] = [];
                jsonData[jsonKey].push(newItem);
                saveJsonData(jsonData);
                return resolveRelations(modelName, newItem, args[0]?.include, jsonData);
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
                  return methodName === 'update' 
                    ? resolveRelations(modelName, updatedItems[0], args[0]?.include, jsonData) 
                    : { count: updatedItems.length };
                }

                return methodName === 'update'
                  ? resolveRelations(modelName, normalizeGymId({ ...data, id: where?.id || 'unknown', updatedAt: new Date() }), args[0]?.include, jsonData)
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
                  return methodName === 'delete' ? resolveRelations(modelName, normalizeGymId(deletedItems[0]), args[0]?.include, jsonData) : { count: deletedItems.length };
                }

                return methodName === 'delete' ? resolveRelations(modelName, normalizeGymId({ id: 'deleted' }), args[0]?.include, jsonData) : { count: 0 };
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

    return (instance as any)[prop];
  }
});

export default prisma;
