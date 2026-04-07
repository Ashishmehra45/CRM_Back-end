const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  // --- Address Information ---
  companyName: { type: String, required: true, index: true }, 
  continent: { 
    type: String, 
    enum: ["Africa", "Asia", "Europe", "North America", "Oceania", "South America", ""] 
  },
  country: { type: String, index: true },
  
  // 🔥 Flattened Address Fields (Frontend ke hisaab se)
  flatHouseNo: String, 
  streetAddress: String,
  city: String,
  state: String,
  zipCode: String,
  latitude: String, 
  longitude: String, 

  // --- Lead Information ---
  firstName: String,
  lastName: { type: String, required: true, index: true },
  title: String,
  phone: String,
  mobile: String,
  
  leadSource: { 
    type: String, 
    enum: ["Cold Call", "Existing Customer", "Self Generated", "Employee Referral", "External Referral", "online store", "Sales Email Alias", "Seminar Partner", "Internal Seminar", "Chat", "Partner", "Public Relations", "Web Download", "Web Research", "Facebook", "Trade Show", "-None-", ""]
  },
  
  industry: { 
    type: String, 
    enum: ["ASP (Application Service Provider)", "Data/Telecom OEM", "ERP (Enterprise Resource Planning)", "Government/Military", "Large Enterprise", "ManagementISV", "MSP (Management Service Provider)", "Network Equipment Enterprise", "Non-management ISV", "Optical Networking", "Service Provider", "Small/Medium Enterprise", "Storage Equipment", "Storage Service Provider", "Systems Integrator", "Wireless Industry", "ERP", "Management ISV", "-None-", ""]
  },

  leadStatus: { 
    type: String, 
    enum: ["Attempted to contact", "Contact in future", "Contacted", "Junk Lead", "Lost Lead", "Not Contacted", "Pre Qualified", "Not Qualified", "-None-", ""]
  },

  rating: { 
    type: String, 
    enum: ["Acquired", "Active", "Market Failed", "Project Cancelled", "Shutdown", "-None-", ""]
  },

  category: { 
    type: String, 
    enum: ["FDI", "CIP", "National PMU", "Repnsonate", "-None-", ""]
  },

  annualRevenue: String,
  emailOptOut: { type: Boolean, default: false }, // Checkbox field
  company: String, // Right side company field
  noOfEmployees: String,
  email: String,
  website: String,
  fax: String,
  skypeId: String,
  secondaryEmail: String, 
  twitter: String,
  description: String,
  timeline: [
    {
      note: { type: String, required: true },
      addedBy: { type: String }, // Worker ka naam
      timestamp: { type: Date, default: Date.now }
    }
  ],

  // --- Relations & Tracking ---
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workerName: { type: String, required: true }
}, { timestamps: true });

// Global Search Index
LeadSchema.index({ companyName: 'text', lastName: 'text', country: 'text' });

module.exports = mongoose.model('Lead', LeadSchema);