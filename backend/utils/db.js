const mongoose = require('mongoose');

let useMock = false;
const mockDb = {
  customers: [],
  orders: [],
  campaigns: [],
  jobs: [],
  logs: []
};

// Simple Mock Query Parser matching MongoDB operations
function matchQuery(item, query) {
  if (!query || Object.keys(query).length === 0) return true;
  
  for (const key in query) {
    const filter = query[key];
    const itemVal = item[key];
    
    if (filter && typeof filter === 'object' && !Array.isArray(filter) && !(filter instanceof Date)) {
      // Handle MongoDB comparison operators
      for (const op in filter) {
        const targetVal = filter[op];
        if (op === '$gt') {
          if (!(itemVal > targetVal)) return false;
        } else if (op === '$lt') {
          if (!(itemVal < targetVal)) return false;
        } else if (op === '$gte') {
          if (!(itemVal >= targetVal)) return false;
        } else if (op === '$lte') {
          if (!(itemVal <= targetVal)) return false;
        } else if (op === '$eq') {
          if (itemVal !== targetVal) return false;
        } else if (op === '$ne') {
          if (itemVal === targetVal) return false;
        } else if (op === '$in') {
          if (!Array.isArray(targetVal) || !targetVal.includes(itemVal)) return false;
        }
      }
    } else {
      // Direct comparison
      if (itemVal !== filter) {
        // Allow date comparison by ISO string
        if (itemVal instanceof Date && filter instanceof Date) {
          if (itemVal.getTime() !== filter.getTime()) return false;
        } else if (itemVal instanceof Date && typeof filter === 'string') {
          if (itemVal.toISOString() !== filter) return false;
        } else {
          return false;
        }
      }
    }
  }
  return true;
}

// Update helper to apply Mongo-like operators
function applyUpdate(item, update) {
  if (!update) return item;
  
  const setOps = update.$set || {};
  const incOps = update.$inc || {};
  const pushOps = update.$push || {};
  
  // Direct values on update (non-operator update)
  if (!update.$set && !update.$inc && !update.$push) {
    Object.assign(item, update);
    return item;
  }

  for (const key in setOps) {
    item[key] = setOps[key];
  }
  
  for (const key in incOps) {
    item[key] = (item[key] || 0) + incOps[key];
  }
  
  for (const key in pushOps) {
    if (!Array.isArray(item[key])) {
      item[key] = [];
    }
    item[key].push(pushOps[key]);
  }
  
  return item;
}

class MockModel {
  constructor(collectionName, schema) {
    this.collectionName = collectionName;
    this.schema = schema;
    if (!mockDb[collectionName]) {
      mockDb[collectionName] = [];
    }
  }

  get data() {
    return mockDb[this.collectionName];
  }

  async find(query = {}) {
    // Make copies of items to avoid mutating database state directly
    return this.data.filter(item => matchQuery(item, query)).map(item => ({ ...item, save: async function() { return this; } }));
  }

  async findOne(query = {}) {
    const item = this.data.find(item => matchQuery(item, query));
    if (!item) return null;
    return { ...item, save: async function() { return this; } };
  }

  async findById(id) {
    const item = this.data.find(item => item._id === id);
    if (!item) return null;
    return { ...item, save: async function() { return this; } };
  }

  async create(doc) {
    const newDoc = {
      _id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date(),
      ...doc
    };
    // Initialize standard fields
    for (const key in this.schema) {
      if (newDoc[key] === undefined && this.schema[key].default !== undefined) {
        newDoc[key] = typeof this.schema[key].default === 'function' ? this.schema[key].default() : this.schema[key].default;
      }
    }
    this.data.push(newDoc);
    return { ...newDoc, save: async function() { return this; } };
  }

  async insertMany(docs) {
    const createdDocs = docs.map(doc => ({
      _id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date(),
      ...doc
    }));
    this.data.push(...createdDocs);
    return createdDocs;
  }

  async updateOne(query, update) {
    const index = this.data.findIndex(item => matchQuery(item, query));
    if (index !== -1) {
      applyUpdate(this.data[index], update);
      return { matchedCount: 1, modifiedCount: 1 };
    }
    return { matchedCount: 0, modifiedCount: 0 };
  }

  async updateMany(query, update) {
    let modifiedCount = 0;
    this.data.forEach(item => {
      if (matchQuery(item, query)) {
        applyUpdate(item, update);
        modifiedCount++;
      }
    });
    return { matchedCount: modifiedCount, modifiedCount };
  }

  async countDocuments(query = {}) {
    return this.data.filter(item => matchQuery(item, query)).length;
  }

  async deleteMany(query = {}) {
    const originalLength = this.data.length;
    const keep = this.data.filter(item => !matchQuery(item, query));
    this.data.length = 0;
    this.data.push(...keep);
    return { deletedCount: originalLength - keep.length };
  }
}

// Connect to real MongoDB or fallback to Mock
const connectDB = async () => {
  if (process.env.NODE_ENV === 'test') {
    useMock = true;
    console.log('⚠️ Running in Test mode. Using in-memory mock database.');
    return;
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_db', {
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout to survive container cold starts
      maxPoolSize: 10 // Prevent connection exhaustion on Render free tier
    });
    console.log('✅ MongoDB connected successfully.');
  } catch (err) {
    console.warn('❌ MongoDB connection failed. Falling back to in-memory mock database.');
    console.warn(`Reason: ${err.message}`);
    useMock = true;
  }
};

function getModel(modelName, schemaObj) {
  const schema = new mongoose.Schema(schemaObj, { minimize: false });

  let mongooseModel;

  try {
    mongooseModel = mongoose.model(modelName, schema);
  } catch (e) {
    mongooseModel = mongoose.model(modelName);
  }

  const mockModel = new MockModel(
    modelName.toLowerCase() + 's',
    schemaObj
  );

  return new Proxy({}, {
    get(target, prop) {
      if (useMock) {
        const value = mockModel[prop];

        if (typeof value === 'function') {
          return value.bind(mockModel);
        }

        return value;
      }

      const value = mongooseModel[prop];

      if (typeof value === 'function') {
        return value.bind(mongooseModel);
      }

      return value;
    }
  });
}

module.exports = {
  connectDB,
  getModel,
  isMock: () => useMock
};
