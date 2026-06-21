import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { User, Material, Grn, Outward, DashboardStats, Supplier, CompanyProfile } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'client-managed-auth',
      email: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. Initialize Firebase if config fields are present
let isFirebaseActive = false;
let firestoreDb: any = null;

try {
  if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId) {
    const app = initializeApp(firebaseConfig);
    // Explicitly pass databaseId as required by instructions
    firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
    isFirebaseActive = true;
    console.log('Firebase initialized successfully for multi-user inventory!');
    
    // Quick validation check
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn("Firebase/Firestore client is offline.");
        }
      }
    };
    testConnection();
  } else {
    console.log('Firebase config is empty. Falling back to robust LocalStorage.');
  }
} catch (err) {
  console.error('Firebase failed to initialize, using LocalStorage fallback mode', err);
  isFirebaseActive = false;
}

// Helper for offline default database seed data
const SEED_USERS: User[] = [
  { id: 'u1', username: 'hr@ulivanutrition.com', password: '123', name: 'SUMIT SURELIYA', role: 'Admin', createdAt: new Date().toISOString() },
  { id: 'u2', username: 'operator', password: '123', name: 'Material Operator', role: 'GRN Operator', createdAt: new Date().toISOString() },
  { id: 'u3', username: 'qc', password: '123', name: 'QC Manager', role: 'QC Operator', createdAt: new Date().toISOString() },
  { id: 'u4', username: 'admin', password: '123', name: 'Super Admin', role: 'Admin', createdAt: new Date().toISOString() }
];

const SEED_MATERIALS: Material[] = [];

const SEED_GRNS: Grn[] = [];

const SEED_OUTWARDS: Outward[] = [];

// LocalStorage helpers or fallbacks
const getLocalData = <T>(key: string, defaultData: T[]): T[] => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(data);
};

const saveLocalData = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const dbService = {
  isFirebaseActive: () => isFirebaseActive,

  // --- USERS OPERATIONS ---
  async fetchUsers(): Promise<User[]> {
    if (isFirebaseActive && firestoreDb) {
      const path = 'users';
      try {
        const querySnapshot = await getDocs(collection(firestoreDb, path));
        const users: User[] = [];
        querySnapshot.forEach((doc) => {
          users.push(doc.data() as User);
        });
        if (users.length === 0) {
          // Setup initial default users on Firestore as well so they can login immediately
          for (const u of SEED_USERS) {
            await this.saveUser(u);
            users.push(u);
          }
        }
        return users;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return getLocalData<User>('inv_clean_users', SEED_USERS);
      }
    } else {
      return getLocalData<User>('inv_clean_users', SEED_USERS);
    }
  },

  async saveUser(user: User): Promise<void> {
    if (isFirebaseActive && firestoreDb) {
      const path = 'users';
      try {
        await setDoc(doc(firestoreDb, path, user.id), user);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${path}/${user.id}`);
      }
    } else {
      const users = getLocalData<User>('inv_clean_users', SEED_USERS);
      // Avoid duplicate username adding
      const existingIdx = users.findIndex(u => u.username.toLowerCase() === user.username.toLowerCase());
      if (existingIdx >= 0) {
        users[existingIdx] = user;
      } else {
        users.push(user);
      }
      saveLocalData('inv_clean_users', users);
    }
  },

  // --- MATERIAL MASTER OPERATIONS ---
  async fetchMaterials(): Promise<Material[]> {
    if (isFirebaseActive && firestoreDb) {
      const path = 'materials';
      try {
        const querySnapshot = await getDocs(collection(firestoreDb, path));
        const list: Material[] = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data() as Material);
        });
        if (list.length === 0) {
          // Seed
          for (const m of SEED_MATERIALS) {
            await this.saveMaterial(m);
            list.push(m);
          }
        }
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return getLocalData<Material>('inv_clean_materials', SEED_MATERIALS);
      }
    } else {
      return getLocalData<Material>('inv_clean_materials', SEED_MATERIALS);
    }
  },

  async saveMaterial(material: Material): Promise<void> {
    if (isFirebaseActive && firestoreDb) {
      const path = 'materials';
      try {
        await setDoc(doc(firestoreDb, path, material.id), material);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${path}/${material.id}`);
      }
    } else {
      const list = getLocalData<Material>('inv_clean_materials', SEED_MATERIALS);
      const existingIdx = list.findIndex(m => m.id === material.id);
      if (existingIdx >= 0) {
        list[existingIdx] = material;
      } else {
        list.push(material);
      }
      saveLocalData('inv_clean_materials', list);
    }
  },

  async deleteMaterial(id: string): Promise<void> {
    if (isFirebaseActive && firestoreDb) {
      const path = 'materials';
      try {
        await deleteDoc(doc(firestoreDb, path, id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
      }
    } else {
      const list = getLocalData<Material>('inv_clean_materials', SEED_MATERIALS);
      const filtered = list.filter(m => m.id !== id);
      saveLocalData('inv_clean_materials', filtered);
    }
  },

  // --- GOODS RECEIPT NOTES (GRN) OPERATIONS ---
  async fetchGrnRecords(): Promise<Grn[]> {
    if (isFirebaseActive && firestoreDb) {
      const path = 'grn';
      try {
        const querySnapshot = await getDocs(collection(firestoreDb, path));
        const list: Grn[] = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data() as Grn);
        });
        if (list.length === 0) {
          for (const g of SEED_GRNS) {
            await this.saveGrn(g);
            list.push(g);
          }
        }
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return getLocalData<Grn>('inv_clean_grn', SEED_GRNS);
      }
    } else {
      return getLocalData<Grn>('inv_clean_grn', SEED_GRNS);
    }
  },

  async saveGrn(grn: Grn): Promise<void> {
    if (isFirebaseActive && firestoreDb) {
      const path = 'grn';
      try {
        await setDoc(doc(firestoreDb, path, grn.id), grn);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${path}/${grn.id}`);
      }
    } else {
      const list = getLocalData<Grn>('inv_clean_grn', SEED_GRNS);
      const existingIdx = list.findIndex(g => g.id === grn.id);
      if (existingIdx >= 0) {
        list[existingIdx] = grn;
      } else {
        list.push(grn);
      }
      saveLocalData('inv_clean_grn', list);
    }
  },

  async updateGrnStatus(id: string, status: 'Approved' | 'Rejected', releaseDate: string): Promise<void> {
    if (isFirebaseActive && firestoreDb) {
      const path = 'grn';
      try {
        const grnRef = doc(firestoreDb, path, id);
        await updateDoc(grnRef, {
          qcStatus: status,
          qcReleaseDate: releaseDate
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
      }
    } else {
      const list = getLocalData<Grn>('inv_clean_grn', SEED_GRNS);
      const existingIdx = list.findIndex(g => g.id === id);
      if (existingIdx >= 0) {
        list[existingIdx].qcStatus = status;
        list[existingIdx].qcReleaseDate = releaseDate;
        saveLocalData('inv_clean_grn', list);
      }
    }
  },

  async deleteGrn(id: string): Promise<void> {
    if (isFirebaseActive && firestoreDb) {
      const path = 'grn';
      try {
        await deleteDoc(doc(firestoreDb, path, id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
      }
    } else {
      const list = getLocalData<Grn>('inv_clean_grn', SEED_GRNS);
      const filtered = list.filter(g => g.id !== id);
      saveLocalData('inv_clean_grn', filtered);
    }
  },

  // --- OUTWARD RECORD OPERATIONS ---
  async fetchOutwardRecords(): Promise<Outward[]> {
    if (isFirebaseActive && firestoreDb) {
      const path = 'outwards';
      try {
        const querySnapshot = await getDocs(collection(firestoreDb, path));
        const list: Outward[] = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data() as Outward);
        });
        if (list.length === 0) {
          for (const o of SEED_OUTWARDS) {
            await this.saveOutwardRecord(o);
            list.push(o);
          }
        }
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return getLocalData<Outward>('inv_clean_outwards', SEED_OUTWARDS);
      }
    } else {
      return getLocalData<Outward>('inv_clean_outwards', SEED_OUTWARDS);
    }
  },

  async saveOutwardRecord(outward: Outward): Promise<void> {
    if (isFirebaseActive && firestoreDb) {
      const path = 'outwards';
      try {
        await setDoc(doc(firestoreDb, path, outward.id), outward);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${path}/${outward.id}`);
      }
    } else {
      const list = getLocalData<Outward>('inv_clean_outwards', SEED_OUTWARDS);
      const existingIdx = list.findIndex(o => o.id === outward.id);
      if (existingIdx >= 0) {
        list[existingIdx] = outward;
      } else {
        list.push(outward);
      }
      saveLocalData('inv_clean_outwards', list);
    }
  },

  async deleteOutwardRecord(id: string): Promise<void> {
    if (isFirebaseActive && firestoreDb) {
      const path = 'outwards';
      try {
        await deleteDoc(doc(firestoreDb, path, id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
      }
    } else {
      const list = getLocalData<Outward>('inv_clean_outwards', SEED_OUTWARDS);
      const filtered = list.filter(o => o.id !== id);
      saveLocalData('inv_clean_outwards', filtered);
    }
  },

  // --- SUPPLIER OPERATIONS ---
  async fetchSuppliers(): Promise<Supplier[]> {
    const defaultSuppliers: Supplier[] = [
      { id: 'sup1', name: 'Alkem Laboratories Ltd', gstNumber: '24AAAAC1234A1Z1', address: 'Plot 12, GIDC, Ankleshwar', email: 'ankleshwar@alkem.com', contactNumber: '9876543210', createdAt: new Date().toISOString() },
      { id: 'sup2', name: 'Sun Pharmaceutical Industries', gstNumber: '24AAACT5678B2Z2', address: 'Survey No. 45, Halol, Gujarat', email: 'purchase@sunpharma.com', contactNumber: '8765432109', createdAt: new Date().toISOString() },
      { id: 'sup3', name: 'Aarti Industries Ltd', gstNumber: '24AAACA9876C3Z3', address: 'Plot 501, Sachin GIDC, Surat', email: 'sales@aarti.com', contactNumber: '7654321098', createdAt: new Date().toISOString() }
    ];

    if (isFirebaseActive && firestoreDb) {
      const path = 'suppliers';
      try {
        const querySnapshot = await getDocs(collection(firestoreDb, path));
        const list: Supplier[] = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data() as Supplier);
        });
        if (list.length === 0) {
          for (const s of defaultSuppliers) {
            await this.saveSupplier(s);
            list.push(s);
          }
        }
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return getLocalData<Supplier>('inv_clean_suppliers', defaultSuppliers);
      }
    } else {
      return getLocalData<Supplier>('inv_clean_suppliers', defaultSuppliers);
    }
  },

  async saveSupplier(supplier: Supplier): Promise<void> {
    if (isFirebaseActive && firestoreDb) {
      const path = 'suppliers';
      try {
        await setDoc(doc(firestoreDb, path, supplier.id), supplier);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${path}/${supplier.id}`);
      }
    } else {
      const list = getLocalData<Supplier>('inv_clean_suppliers', []);
      const existingIdx = list.findIndex(s => s.id === supplier.id || s.name.trim().toLowerCase() === supplier.name.trim().toLowerCase());
      if (existingIdx >= 0) {
        list[existingIdx] = { ...list[existingIdx], ...supplier };
      } else {
        list.push(supplier);
      }
      saveLocalData('inv_clean_suppliers', list);
    }
  },

  // --- COMPANY PROFILE OPERATIONS ---
  async fetchCompanyProfile(): Promise<CompanyProfile> {
    const defaultProfile: CompanyProfile = {
      companyName: '',
      logoUrl: '',
      gstNumber: '',
      address: '',
      email: '',
      contactNumber: '',
      updatedAt: new Date().toISOString()
    };

    if (isFirebaseActive && firestoreDb) {
      const path = 'company_profile';
      try {
        const docRef = doc(firestoreDb, path, 'main');
        const querySnapshot = await getDocs(collection(firestoreDb, path));
        let profile: CompanyProfile | null = null;
        querySnapshot.forEach((doc) => {
          if (doc.id === 'main') {
            profile = doc.data() as CompanyProfile;
          }
        });
        if (!profile) {
          await setDoc(docRef, defaultProfile);
          return defaultProfile;
        }
        return profile;
      } catch (error) {
        // Fallback local storage
        const local = localStorage.getItem('inv_clean_company_profile');
        return local ? JSON.parse(local) : defaultProfile;
      }
    } else {
      const local = localStorage.getItem('inv_clean_company_profile');
      return local ? JSON.parse(local) : defaultProfile;
    }
  },

  async saveCompanyProfile(profile: CompanyProfile): Promise<void> {
    localStorage.setItem('inv_clean_company_profile', JSON.stringify(profile));
    if (isFirebaseActive && firestoreDb) {
      const path = 'company_profile';
      try {
        await setDoc(doc(firestoreDb, path, 'main'), profile);
      } catch (error) {
        console.error('Firestore save company profile error', error);
      }
    }
  }
};
