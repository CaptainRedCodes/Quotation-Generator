'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, Pencil, Trash2, X, Package, AlertCircle } from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string | null
  active: boolean
  components: ProductComponent[]
}

interface ProductComponent {
  id: string
  componentName: string
  sacCode: string | null
  quantity: number
  unitPrice: number
  isEditable: boolean
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true,
    components: [] as ProductComponent[]
  })

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      setError(null)
      const res = await fetch('/api/products')
      if (!res.ok) throw new Error('Failed to load products')
      const data = await res.json()
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
      setError(error instanceof Error ? error.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name,
        description: product.description || '',
        active: product.active,
        components: product.components.map(c => ({
          ...c,
          isEditable: true
        }))
      })
    } else {
      setEditingProduct(null)
      setFormData({
        name: '',
        description: '',
        active: true,
        components: []
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingProduct(null)
    setFormData({
      name: '',
      description: '',
      active: true,
      components: []
    })
  }

  const handleAddComponent = () => {
    setFormData({
      ...formData,
      components: [
        ...formData.components,
        {
          id: `new-${Date.now()}`,
          componentName: '',
          sacCode: '',
          quantity: 1,
          unitPrice: 0,
          isEditable: true
        }
      ]
    })
  }

  const handleUpdateComponent = (index: number, field: string, value: string | number) => {
    const updated = [...formData.components]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, components: updated })
  }

  const handleDeleteComponent = (index: number) => {
    setFormData({
      ...formData,
      components: formData.components.filter((_, i) => i !== index)
    })
  }

  const handleSave = async () => {
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setSuccess(editingProduct ? 'Product updated successfully!' : 'Product created successfully!')
        await loadProducts()
        handleCloseModal()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save product')
      }
    } catch (error) {
      console.error('Error saving product:', error)
      setError(error instanceof Error ? error.message : 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSuccess('Product deleted successfully!')
        await loadProducts()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to delete product')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete product')
    }
  }

  const toggleActive = async (product: Product) => {
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...product, active: !product.active })
      })
      
      if (res.ok) {
        setSuccess(`Product ${!product.active ? 'activated' : 'deactivated'} successfully!`)
        await loadProducts()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update product')
      }
    } catch (error) {
      console.error('Error toggling product:', error)
      setError(error instanceof Error ? error.message : 'Failed to update product')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-blue-900 text-white py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Products</h1>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-700 rounded-md"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">{success}</p>
          </div>
        )}
        
        <div className="space-y-4">
          {products.length === 0 ? (
            <div className="bg-white rounded-lg shadow border border-slate-200 p-8 text-center">
              <Package className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-500">No products yet. Add your first product!</p>
            </div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow border border-slate-200">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">{product.name}</h2>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      product.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {product.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(product)}
                      className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50"
                    >
                      {product.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleOpenModal(product)}
                      className="p-2 text-slate-600 hover:text-slate-800 border border-slate-300 rounded hover:bg-slate-50"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-red-600 hover:text-red-800 border border-slate-300 rounded hover:bg-slate-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {product.description && (
                  <div className="px-4 py-2 bg-slate-50 text-sm text-slate-600">
                    {product.description}
                  </div>
                )}
                <div className="p-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    Components ({product.components.length})
                  </p>
                  {product.components.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-slate-600">Component</th>
                            <th className="px-3 py-2 text-left text-slate-600">SAC Code</th>
                            <th className="px-3 py-2 text-left text-slate-600">Qty</th>
                            <th className="px-3 py-2 text-left text-slate-600">Unit Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {product.components.map((comp) => (
                            <tr key={comp.id}>
                              <td className="px-3 py-2">{comp.componentName}</td>
                              <td className="px-3 py-2">{comp.sacCode || '-'}</td>
                              <td className="px-3 py-2">{comp.quantity}</td>
                              <td className="px-3 py-2">₹{comp.unitPrice.toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button onClick={handleCloseModal} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <label htmlFor="active" className="text-sm text-slate-700">Active</label>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">Components</label>
                  <button
                    onClick={handleAddComponent}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-4 h-4" />
                    Add Component
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.components.map((comp, index) => (
                    <div key={comp.id} className="flex gap-2 items-start">
                      <input
                        type="text"
                        placeholder="Component Name"
                        value={comp.componentName}
                        onChange={(e) => handleUpdateComponent(index, 'componentName', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="SAC"
                        value={comp.sacCode || ''}
                        onChange={(e) => handleUpdateComponent(index, 'sacCode', e.target.value)}
                        className="w-20 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={comp.quantity}
                        onChange={(e) => handleUpdateComponent(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-20 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={comp.unitPrice}
                        onChange={(e) => handleUpdateComponent(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-28 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <button
                        onClick={() => handleDeleteComponent(index)}
                        className="p-2 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.name}
                  className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
