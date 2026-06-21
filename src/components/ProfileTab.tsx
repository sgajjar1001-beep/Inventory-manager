import React, { useState, useEffect } from 'react';
import { CompanyProfile, User } from '../types';
import { dbService } from '../services/db';
import { Building2, Save, FileText, Phone, Mail, MapPin, BadgeCheck, Upload, Image } from 'lucide-react';
import { parseGSTIN } from './GrnTab';

interface ProfileTabProps {
  currentUser: User;
  onProfileUpdated?: () => void;
}

export default function ProfileTab({ currentUser, onProfileUpdated }: ProfileTabProps) {
  const [profile, setProfile] = useState<CompanyProfile>({
    companyName: '',
    gstNumber: '',
    address: '',
    email: '',
    contactNumber: '',
    updatedAt: new Date().toISOString()
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CompanyProfile>({
    companyName: '',
    gstNumber: '',
    address: '',
    email: '',
    contactNumber: '',
    updatedAt: new Date().toISOString()
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const data = await dbService.fetchCompanyProfile();
      setProfile(data);
      setFormData(data);
    }
    loadProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          logoUrl: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...formData,
      updatedAt: new Date().toISOString()
    };
    await dbService.saveCompanyProfile(updated);
    setProfile(updated);
    setIsEditing(false);
    setSaveSuccess(true);
    if (onProfileUpdated) onProfileUpdated();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h2 id="profile-title" className="text-xl font-bold font-sans text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#8ed5ff]" />
          <span>Company Identity Profile</span>
        </h2>
        <p className="text-xs text-[#87929a] mt-1 font-sans">
          Manage warehouse corporate credentials, legal GST registration, and communication details printed during reports.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Card - Presentational Company Card */}
        <div className="md:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center text-center space-y-4">
          <div className="relative group w-24 h-24 rounded-2xl bg-[#8ed5ff]/10 border-2 border-dashed border-[#8ed5ff]/30 flex items-center justify-center overflow-hidden">
            {formData.logoUrl ? (
              <img 
                src={formData.logoUrl} 
                alt="Logo" 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <Building2 className="w-10 h-10 text-[#8ed5ff]" />
            )}
            {isEditing && (
              <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer">
                <Upload className="w-5 h-5 text-white" />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLogoUpload} 
                  className="hidden" 
                />
              </label>
            )}
          </div>

          <div>
            <h3 className="font-bold text-white text-base">{profile.companyName || 'Inventory Master'}</h3>
            <span className="text-[10px] bg-[#8ed5ff]/10 border border-[#8ed5ff]/20 text-[#8ed5ff] px-2.5 py-0.5 rounded-full font-bold font-mono tracking-wide mt-1.5 inline-block">
              GST: {profile.gstNumber || 'PENDING'}
            </span>
          </div>

          <div className="w-full border-t border-white/5 pt-4 space-y-2.5 text-left text-xs text-[#dae2fd]">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span className="text-[11px] leading-relaxed text-[#bdc8d1]">{profile.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-[11px] text-[#bdc8d1] truncate">{profile.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-[11px] text-[#bdc8d1]">{profile.contactNumber}</span>
            </div>
          </div>
        </div>

        {/* Right Details / Edit Form */}
        <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">
              {isEditing ? 'Modify Credentials form' : 'Verified Registered Details'}
            </h3>
            {currentUser.role === 'Admin' && !isEditing && (
              <button
                id="edit-profile-btn"
                onClick={() => {
                  setFormData({ ...profile });
                  setIsEditing(true);
                }}
                className="px-3.5 py-1.5 bg-[#8ed5ff] text-slate-900 font-bold text-xs rounded-xl hover:bg-[#aee0ff] transition cursor-pointer"
              >
                Edit Profile
              </button>
            )}
          </div>

          {saveSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2 mb-4 animate-pulse">
              <BadgeCheck className="w-4 h-4 shrink-0" />
              <span>Company details profile saved successfully database node.</span>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#87929a] uppercase tracking-wide mb-1.5">
                    Company Trade Name
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    required
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="Enter registered business name"
                    className="w-full text-xs p-2.5 bg-white/5 border border-white/10 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#87929a] uppercase tracking-wide mb-1.5 flex justify-between items-center">
                    <span>GSTIN Number</span>
                    {formData.gstNumber.trim().length === 15 && (
                      <button
                        type="button"
                        onClick={() => {
                          const info = parseGSTIN(formData.gstNumber);
                          if (info) {
                            setFormData(prev => ({
                              ...prev,
                              companyName: info.companyName,
                              address: info.address,
                              email: info.email,
                              contactNumber: info.contactNumber
                            }));
                          }
                        }}
                        className="text-[9px] bg-sky-500/10 hover:bg-sky-500/20 text-[#8ed5ff] px-2 py-0.5 rounded transition font-bold cursor-pointer"
                      >
                        ✨ Auto-fill details
                      </button>
                    )}
                  </label>
                  <input
                    type="text"
                    name="gstNumber"
                    required
                    value={formData.gstNumber}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setFormData(prev => {
                        const updated = { ...prev, gstNumber: val };
                        if (val.trim().length === 15) {
                          const info = parseGSTIN(val);
                          if (info) {
                            updated.companyName = info.companyName;
                            updated.address = info.address;
                            updated.email = info.email;
                            updated.contactNumber = info.contactNumber;
                          }
                        }
                        return updated;
                      });
                    }}
                    placeholder="e.g. 24AAACO1314M1ZP"
                    className="w-full text-xs p-2.5 bg-white/5 border border-white/10 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#87929a] uppercase tracking-wide mb-1.5">
                    Official Contact E-mail
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="info@yourcompany.com"
                    className="w-full text-xs p-2.5 bg-white/5 border border-white/10 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#87929a] uppercase tracking-wide mb-1.5">
                    Contact Hotline Number
                  </label>
                  <input
                    type="text"
                    name="contactNumber"
                    required
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                    placeholder="+91 99999 88888"
                    className="w-full text-xs p-2.5 bg-white/5 border border-white/10 rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-[#87929a] uppercase tracking-wide mb-1.5">
                    Registered Headquarters Address
                  </label>
                  <textarea
                    name="address"
                    required
                    rows={3}
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Provide full postal address coordinates"
                    className="w-full text-xs p-2.5 bg-white/5 border border-white/10 rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-[#87929a] uppercase tracking-wide mb-1.5">
                    Alternate Logo Base64 string (optional)
                  </label>
                  <input
                    type="text"
                    name="logoUrl"
                    value={formData.logoUrl || ''}
                    onChange={handleInputChange}
                    placeholder="Paste corporate logo image url/base64"
                    className="w-full text-xs p-2.5 bg-white/5 border border-white/10 rounded-xl font-mono text-stone-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  id="cancel-profile-btn"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-profile-btn"
                  className="px-5 py-2.5 bg-[#8ed5ff] text-slate-900 font-bold text-xs rounded-xl hover:bg-[#aee0ff] transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Profile Data</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-xs font-sans">
              <div className="bg-white/5 p-4 rounded-xl space-y-3">
                <div className="grid grid-cols-3 py-1.5 border-b border-white/5">
                  <span className="text-[#87929a] font-bold uppercase tracking-wider">Legal Entity:</span>
                  <span className="col-span-2 text-white font-semibold">{profile.companyName}</span>
                </div>
                <div className="grid grid-cols-3 py-1.5 border-b border-white/5">
                  <span className="text-[#87929a] font-bold uppercase tracking-wider">GST Registration:</span>
                  <span className="col-span-2 text-white font-bold font-mono text-sky-400">{profile.gstNumber}</span>
                </div>
                <div className="grid grid-cols-3 py-1.5 border-b border-white/5">
                  <span className="text-[#87929a] font-bold uppercase tracking-wider">Customer Support:</span>
                  <span className="col-span-2 text-white font-medium">{profile.contactNumber}</span>
                </div>
                <div className="grid grid-cols-3 py-1.5 border-b border-white/5">
                  <span className="text-[#87929a] font-bold uppercase tracking-wider">Email Inbox:</span>
                  <span className="col-span-2 text-white font-medium">{profile.email}</span>
                </div>
                <div className="grid grid-cols-3 py-1.5">
                  <span className="text-[#87929a] font-bold uppercase tracking-wider">Corporate Hub:</span>
                  <span className="col-span-2 text-white leading-relaxed">{profile.address}</span>
                </div>
              </div>

              <div className="text-[10px] text-[#87929a] font-mono leading-relaxed bg-[#8ed5ff]/5 border border-[#8ed5ff]/10 p-3.5 rounded-xl">
                📝 <b>Integrity Guarantee:</b> The company GSTIN, office address, and contact details listed above are automatically printed on Goods Receipt Notes, Inward Ledgers, Quality Release Certificates, and Production Outward Issue Vouchers generated from this workspace node.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
