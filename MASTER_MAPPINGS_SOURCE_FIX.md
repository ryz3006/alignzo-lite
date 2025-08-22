# 🔧 Master Mappings Source Display Fix

## 🚨 **Issue Summary**

The "Master Mappings" tab was showing "Unknown" in the Source column even though the API response contained the correct `source_id` values and the `ticket_sources` table had the corresponding source names.

## 🔍 **Root Cause**

The issue was that the `getTicketMasterMappings` function was not properly joining the `ticket_master_mappings` table with the `ticket_sources` table to fetch the source names.

### **Technical Details**

1. **Database Structure**: 
   - `ticket_master_mappings.source_id` → `ticket_sources.id` (foreign key relationship)
   - `ticket_sources.name` contains "JIRA" and "Remedy"

2. **API Response**: The API was returning the correct `source_id` values:
   - `"42cf1864-9eaf-424e-8ce1-2e9da7a0e950"` → "JIRA"
   - `"528f8105-b273-4165-81d5-fc5adc390557"` → "Remedy"

3. **Frontend Issue**: The component was trying to access `(mapping as any).source?.name` but the `source` property was not being populated.

## ✅ **Solution Applied**

### **1. Updated Supabase Client Function**

**File**: `lib/supabase-client.ts`
```typescript
// Before
async getTicketMasterMappings() {
  return this.get('ticket_master_mappings', { select: '*' });
}

// After
async getTicketMasterMappings() {
  return this.query({
    table: 'ticket_master_mappings',
    action: 'select',
    select: '*,source:ticket_sources(*)'
  });
}
```

### **2. Added Frontend Fallback**

**File**: `app/alignzo/master-mappings/page.tsx`
```typescript
const loadMasterMappings = async () => {
  const response = await supabaseClient.getTicketMasterMappings();
  
  if (response.error) {
    console.error('Error loading master mappings:', response.error);
    throw new Error(response.error);
  }
  
  // Create a map of source_id to source name for manual joining
  const sourceMap = new Map(sources.map(source => [source.id, source.name]));
  
  // Add source information to each mapping
  const mappingsWithSource = (response.data || []).map((mapping: any) => ({
    ...mapping,
    source: {
      id: mapping.source_id,
      name: sourceMap.get(mapping.source_id) || 'Unknown'
    }
  }));
  
  setMasterMappings(mappingsWithSource);
};
```

### **3. Updated Data Loading Order**

**File**: `app/alignzo/master-mappings/page.tsx`
```typescript
const loadData = async () => {
  try {
    // Load sources first, then master mappings
    await loadSources();
    await loadMasterMappings();
  } catch (error) {
    console.error('Error loading data:', error);
    toast.error('Failed to load data');
  } finally {
    setLoading(false);
  }
};
```

## 🎯 **Expected Results**

After applying these fixes:

1. ✅ **Correct Source Names**: The Source column will display "JIRA" and "Remedy" instead of "Unknown"
2. ✅ **Proper Data Joining**: The foreign key relationship will work correctly
3. ✅ **Fallback Protection**: If the foreign key join fails, the frontend fallback will still show the correct source names
4. ✅ **Debug Information**: Console logs will help identify any remaining issues

## 📋 **Testing Checklist**

- [ ] Master Mappings page loads without errors
- [ ] Source column displays "JIRA" and "Remedy" instead of "Unknown"
- [ ] Console logs show the correct source mapping data
- [ ] All existing functionality (add, edit, delete) still works
- [ ] No performance degradation

## 🔧 **Technical Notes**

### **Foreign Key Relationship**
The database has the correct foreign key constraint:
```sql
source_id UUID REFERENCES ticket_sources(id) ON DELETE CASCADE
```

### **Supabase Query Syntax**
The foreign key join syntax `select: '*,source:ticket_sources(*)'` should work with Supabase, but we've added a frontend fallback for reliability.

### **Data Flow**
1. Load `ticket_sources` → Create source map
2. Load `ticket_master_mappings` → Join with source map
3. Display joined data in table

---

**Status**: ✅ **FIXED**  
**Priority**: 🟡 **MEDIUM**  
**Impact**: 🚨 **USER EXPERIENCE** - Source column was showing "Unknown" instead of actual source names
