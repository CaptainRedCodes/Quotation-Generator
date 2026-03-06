const fs = require('fs');
const file = 'app/dashboard/quotation/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace date display
content = content.replace(
  `{quotation.status.toUpperCase()}
          </span>
        </div>`,
  `{quotation.status.toUpperCase()}
          </span>
        </div>
        <div className="mb-4 text-sm text-gray-500">
           Date: {isEditing ? <input type="date" value={editData.date ? new Date(editData.date).toISOString().split('T')[0] : ''} onChange={(e) => setEditData({...editData, date: new Date(e.target.value)})} className="px-2 py-1 border rounded" /> : formatDate(quotation.date)}
        </div>`
);

// Add date to editData initializations
content = content.replace(
  `toEmail: data.toEmail || '',
          termsConditions: data.termsConditions || '',`,
  `toEmail: data.toEmail || '',
          date: data.date,
          termsConditions: data.termsConditions || '',`
);

content = content.replace(
  `toEmail: quotation.toEmail || '',
        termsConditions: quotation.termsConditions || '',`,
  `toEmail: quotation.toEmail || '',
        date: quotation.date,
        termsConditions: quotation.termsConditions || '',`
);
content = content.replace(
  `toEmail: quotation.toEmail || '',
        termsConditions: quotation.termsConditions || '',`,
  `toEmail: quotation.toEmail || '',
        date: quotation.date,
        termsConditions: quotation.termsConditions || '',`
);

// Add date to payload
content = content.replace(
  `const payload = {
        ...editData,
        discountAmount,`,
  `const payload = {
        ...editData,
        date: (editData as any).date ? new Date((editData as any).date).toISOString() : quotation.date,
        discountAmount,`
);

// Add buttons logic for workflow state transitions
content = content.replace(
  `<div className="grid grid-cols-3 gap-6">`,
  `<div className="flex justify-end gap-2 mb-4">
          <button onClick={downloadPDF} disabled={actionLoading === 'download'} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">
            {actionLoading === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Download
          </button>
          
          {quotation.status === 'draft' && (
            <>
              <button onClick={() => setShowConfirmQuotation(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                <Check className="w-4 h-4" /> Confirm Quotation
              </button>
              <button onClick={handleGenerateInvoiceClick} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">
                Generate Invoice
              </button>
              <button onClick={handleDeleteClick} className="flex items-center gap-1 px-3 py-1.5 text-red-600 border border-red-200 rounded-md hover:bg-red-50 text-sm">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          )}

          {quotation.status === 'sent' && (
            <>
              <button onClick={handleGenerateInvoiceClick} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">
                Generate Invoice
              </button>
              <button onClick={handleDeleteClick} className="flex items-center gap-1 px-3 py-1.5 text-red-600 border border-red-200 rounded-md hover:bg-red-50 text-sm">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          )}

          {quotation.status === 'accepted' && quotation.invoiceId && (
            <Link href={\`/dashboard/invoice/\${quotation.invoiceId}\`} className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-sm">
              View Invoice
            </Link>
          )}
        </div>
        <div className="grid grid-cols-3 gap-6">`
);


// Replace the subtotal footer in the non-editing mode
content = content.replace(
  `{/* ── Summary Sidebar ── */}`,
  `{Math.abs(editSubtotal - deriveFinancials(quotation.items).subtotal) < 0.01 && !isEditingItems && (
                          <tfoot>
                            <tr>
                              <td colSpan={4} className="pt-3 text-right pr-2 text-sm font-semibold">Items Subtotal:</td>
                              <td className="pt-3 text-right font-bold text-sm text-gray-900">{formatIndianCurrency(deriveFinancials(quotation.items).subtotal)}</td>
                            </tr>
                          </tfoot>
                        )}
                        {/* ── Summary Sidebar ── */}`
);

// Fix Discount value clamp
content = content.replace(
  `onChange={(e) => setEditData({ ...editData, discountValue: parseFloat(e.target.value) || 0 } as any)}`,
  `onChange={(e) => {
                          let val = parseFloat(e.target.value) || 0;
                          if ((editData as any).discountType === 'percentage') {
                            val = Math.min(val, 100);
                          } else {
                            val = Math.min(val, quotation.subtotal);
                          }
                          setEditData({ ...editData, discountValue: val } as any);
                        }}`
);

fs.writeFileSync(file, content);
console.log('Patched');
