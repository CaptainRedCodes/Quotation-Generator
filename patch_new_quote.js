const fs = require('fs');
const file = 'app/dashboard/quotation/new/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add validation imports
content = content.replace(
  "import { useOrg } from '@/components/OrgContext'",
  "import { useOrg } from '@/components/OrgContext'\nimport { validateGst, validateMobile, validateEmailRegex } from '@/lib/validation'"
);

// 2. Add shake state and UI locks
content = content.replace(
  "const [saveSuccess, setSaveSuccess] = useState(false)",
  "const [saveSuccess, setSaveSuccess] = useState(false)\n  const [shakeButton, setShakeButton] = useState(false)\n  const [isSavedLock, setIsSavedLock] = useState(false)"
);

// 3. Update validateForm
const oldValidateForm = `  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!qState.toCompanyName.trim()) newErrors.toCompanyName = "Company Name is required"
    if (!qState.toAddress.trim()) newErrors.toAddress = "Address is required"

    if (qState.toGstNo) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
      if (!gstRegex.test(qState.toGstNo.toUpperCase())) {
        newErrors.toGstNo = "Invalid GST number format"
      }
    }

    if (qState.toPhone) {
      const phoneRegex = /^[6-9][0-9]{9}$/
      if (!phoneRegex.test(qState.toPhone)) {
        newErrors.toPhone = "Enter a valid 10-digit Indian mobile number"
      }
    }

    if (qState.toEmail) {
      const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
      if (!emailRegex.test(qState.toEmail)) {
        newErrors.toEmail = "Enter a valid email address"
      }
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      // Scroll to top or first error
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return false
    }
    return true
  }`;

const newValidateForm = `  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!qState.toCompanyName.trim()) newErrors.toCompanyName = "Company Name is required"
    if (!qState.toAddress.trim()) newErrors.toAddress = "Address is required"
    
    const gstErr = validateGst(qState.toGstNo);
    if (gstErr) newErrors.toGstNo = gstErr;
    
    const phoneErr = validateMobile(qState.toPhone);
    if (phoneErr) newErrors.toPhone = phoneErr;
    
    const emailErr = validateEmailRegex(qState.toEmail);
    if (emailErr) newErrors.toEmail = emailErr;

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      setShakeButton(true);
      setTimeout(() => setShakeButton(false), 500);
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return false
    }
    return true
  }`;

content = content.replace(oldValidateForm, newValidateForm);

if (content.includes("validation UX pattern")) {
  console.log('Whoops');
}

// 4. Update save success to set lock
content = content.replace(
  "setSaveSuccess(true)",
  "setSaveSuccess(true)\n      setIsSavedLock(true)"
);

// 5. Update top bar - remove duplicate save button
content = content.replace(
  `<button onClick={() => handleSave('draft')} disabled={saving} className="px-3 py-1.5 bg-black text-white text-sm rounded-md disabled:opacity-50">
              {saving ? 'Saving...' : 'Save As Draft'}
            </button>`,
  ""
);

// 6. Update company inputs
// Apply lock
content = content.replace(/className={\`w-full mt-1 px-3/g, "readOnly={isSavedLock} className={`w-full mt-1 px-3 disabled:bg-gray-50 disabled:cursor-not-allowed ${isSavedLock ? 'bg-gray-50 cursor-not-allowed' : ''}");

// Add onBlur for GST
content = content.replace(
  `onBlur={applyGSTTypeCheck} // Call without argument, relies on qState.toGstNo`,
  `onBlur={(e) => {
                      applyGSTTypeCheck();
                      const err = validateGst(e.target.value);
                      setErrors(prev => ({...prev, toGstNo: err}));
                    }}`
);

// GST Badge
content = content.replace(
  `{qState.toGstNo && qState.toGstNo.length >= 2 && companySettings?.gstNo && (
                      <span className={\`text-[10px] px-1.5 py-0.5 rounded \${qState.gstType === 'cgst_sgst' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}\`}>
                        {qState.gstType === 'cgst_sgst' ? 'CGST+SGST Applies' : 'IGST Applies'}
                      </span>
                    )}`,
  ``
);

content = content.replace(
  `{errors.toGstNo && <p className="text-red-500 text-xs mt-1">{errors.toGstNo}</p>}`,
  `{errors.toGstNo && <p className="text-red-500 text-xs mt-1">{errors.toGstNo}</p>}
                  {!errors.toGstNo && <div className="mt-1 min-h-[20px]">
                    {qState.toGstNo && qState.toGstNo.length >= 2 && companySettings?.gstNo ? (
                      qState.gstType === 'cgst_sgst' ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Intra-state · CGST + SGST will apply</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">Inter-state · IGST will apply</span>
                      )
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">GST number not provided · defaulting to IGST</span>
                    )}
                  </div>}`
);

// Add onBlur for Phone
content = content.replace(
  `{errors.toPhone && <p className="text-red-500 text-xs mt-1">{errors.toPhone}</p>}`,
  `{errors.toPhone && <p className="text-red-500 text-xs mt-1">{errors.toPhone}</p>}`
);
content = content.replace(
  `className={\`w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 \${errors.toPhone ? 'border-red-500' : ''}\`}`,
  `onBlur={(e) => setErrors(prev => ({...prev, toPhone: validateMobile(e.target.value)}))}\n                    className={\`w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 \${errors.toPhone ? 'border-red-500' : ''}\`}`
);

// Add onBlur for Email
content = content.replace(
  `className={\`w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 \${errors.toEmail ? 'border-red-500' : ''}\`}`,
  `onBlur={(e) => setErrors(prev => ({...prev, toEmail: validateEmailRegex(e.target.value)}))}\n                    className={\`w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 \${errors.toEmail ? 'border-red-500' : ''}\`}`
);


// 7. Update Save behavior lock banner
content = content.replace(
  `{saveSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <p className="text-green-800 text-sm font-medium">✓ Quotation saved. You can now download the PDF.</p>
            <button onClick={() => router.push('/dashboard')} className="text-sm text-green-700 underline hover:text-green-900">Go to Dashboard</button>
          </div>
        )}`,
  `{isSavedLock && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <p className="text-green-800 text-sm font-medium">✓ Saved — click Edit to make changes</p>
            <button onClick={() => setIsSavedLock(false)} className="px-4 py-1.5 bg-white border border-green-300 rounded text-sm text-green-700 hover:bg-green-50">Edit</button>
          </div>
        )}`
);

// 8. Update Discount clamp
content = content.replace(
  `<input type="number" min={0} value={discountConfig.value} onChange={(e) => { setDiscountConfig({ ...discountConfig, value: parseFloat(e.target.value) || 0 }); markDirty() }} className="w-24 px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />`,
  `<input type="number" min={0} value={discountConfig.value} readOnly={isSavedLock}
                 onChange={(e) => { 
                   let val = parseFloat(e.target.value) || 0;
                   if (discountConfig.type === 'percentage') val = Math.min(val, 100);
                   else {
                     const freshSubtotal = items.reduce((sum, item) => sum + (item.isProductHeader ? 0 : item.totalPrice), 0);
                     val = Math.min(val, freshSubtotal);
                   }
                   setDiscountConfig({ ...discountConfig, value: val });
                   markDirty();
                 }} 
                 className={\`w-24 px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 \${isSavedLock ? 'bg-gray-50 cursor-not-allowed' : ''}\`} />
                 {((discountConfig.type === 'percentage' && discountConfig.value === 100) || (discountConfig.type === 'fixed' && discountConfig.value > 0 && discountConfig.value === items.reduce((sum, item) => sum + (item.isProductHeader ? 0 : item.totalPrice), 0))) && (
                    <p className="text-xs text-orange-500 col-span-2 mt-1 -ml-4 w-48">Discount cannot exceed subtotal</p>
                 )}`
);

// 9. Update GST Dropdown
content = content.replace(
  `<label className="block text-sm font-medium text-slate-700 mb-1">GST %</label>
                  <input type="number" min={0} value={gstPercent} onChange={(e) => { setGstPercent(parseFloat(e.target.value) || 0); markDirty() }} className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />`,
  `<label className="block text-sm font-medium text-slate-700 mb-1">GST %</label>
                  <select value={gstPercent} disabled={isSavedLock} onChange={(e) => { setGstPercent(parseFloat(e.target.value)); markDirty() }} className={\`w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 \${isSavedLock ? 'bg-gray-50 cursor-not-allowed' : ''}\`}>
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18% (default)</option>
                    <option value={28}>28%</option>
                  </select>`
);

// 10. Update table items inputs with lock
content = content.replace(/readOnly={item.isProductHeader}/g, "readOnly={item.isProductHeader || isSavedLock}");
content = content.replace(/className="w-full px-2 py-1/g, "className={`w-full px-2 py-1 ${isSavedLock ? 'bg-gray-50' : ''}");

// 11. Button animation
content = content.replace(
  `<button onClick={() => handleSave('draft')} disabled={saving} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 disabled:opacity-50 font-medium">`,
  `<button onClick={() => handleSave('draft')} disabled={saving} className={\`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 disabled:opacity-50 font-medium \${shakeButton ? 'animate-bounce' : ''}\`}>`
);

fs.writeFileSync(file, content);
console.log('Patched NewQuotationPage.tsx successfully');
