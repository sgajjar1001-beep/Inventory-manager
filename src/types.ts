/**
 * Types representing the data models for the Material Inventory Management application.
 */

export type UserRole = 'Admin' | 'GRN Operator' | 'QC Operator' | 'Viewer';

export interface User {
  id: string;
  username: string;
  password?: string; // Stored securely
  name: string;
  role: UserRole;
  createdAt: string;
}

export type MaterialCategory = 'Raw Material' | 'PPM' | 'SPM' | 'Capsule';

export interface Material {
  id: string;
  materialCode: string; // Unique material master code
  materialName: string;
  category: MaterialCategory;
  uom: string; // Unit of measurement
  minStock: number; // Minimum safe stocking level
  createdAt: string;
  palletNo?: string; // Pallet number for warehouse storage tracking
  drumNo?: string;   // Drum number or sequence for individual drum units inside pallet
}

export type QcStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Grn {
  id: string;
  grnNo: string;
  grnDate: string; // YYYY-MM-DD
  supplierName: string;
  materialId: string;
  materialName: string; // Denormalized for rapid lists presentation
  batchNo: string;
  qty: number;
  mfgDate: string;
  expDate: string;
  invoiceNo?: string;
  coaNo?: string;
  warehouseLocation?: string; // RM Store, PPM Store, QC Hold Area, etc.
  receivedBy?: string;
  qcStatus: QcStatus;
  qcReleaseDate?: string;
  palletNo?: string; // Pallet number for warehouse storage tracking
  drumNo?: string;   // Drum number or sequence for individual drum units inside pallet
  remarks?: string;
  createdOn: string;
  sourceType?: 'Supplier' | 'Production Return' | 'Jobwork Return';
  // Jobwork Return details
  jobworkRefNo?: string; // Original outward / challan document reference returned from
}

export interface Outward {
  id: string;
  outwardNo: string;
  outwardDate: string; // YYYY-MM-DD
  materialId: string;
  materialName: string;
  batchNo: string;
  qty: number;
  department: string; // Department/Workstation used in (e.g. "Production Use", "Jobwork / Gamma")
  issuedBy: string; // Operator who did the outward
  remarks?: string;
  createdOn: string;
  outwardType?: 'Trial' | 'Sample' | 'Commercial Use';
  // Jobwork specific fields
  jobworkVendorName?: string;
  jobworkDocNo?: string;
  jobworkPackingType?: string; // Box, Bag, Drum, etc.
  jobworkPackingQty?: number;
}

export interface DashboardStats {
  totalMaterials: number;
  totalGrn: number;
  qcPending: number;
  qcApproved: number;
  qcRejected: number;
}

export interface Supplier {
  id: string;
  name: string;
  gstNumber?: string;
  address?: string;
  email?: string;
  contactNumber?: string;
  createdAt: string;
}

export interface CompanyProfile {
  companyName: string;
  logoUrl?: string; // Base64 or icon
  gstNumber: string;
  address: string;
  email: string;
  contactNumber: string;
  updatedAt: string;
}

