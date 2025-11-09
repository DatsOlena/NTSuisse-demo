import { useState, useEffect } from 'react'
import { fetchAllItems, createItem, deleteItem, type DataItem } from '../api/api'
import ItemForm from '../components/ItemForm'
import ItemList from '../components/ItemList'
import Loader from '../components/Loader'

export default function DataManagement() {
  const [data, setData] = useState<DataItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchAllItems()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (formData: { name: string; description: string }) => {
    try {
      setError(null)
      await createItem(formData.name.trim(), formData.description.trim())
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return
    }

    try {
      setDeletingId(id)
      setError(null)
      await deleteItem(id)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen py-8 bg-secondary">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold color-primary mb-8">
          Data Management
        </h1>

        <div className="bg-primary rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold color-primary mb-4">
            Add New Item
          </h2>
          <ItemForm onSubmit={handleSubmit} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

          <div className="bg-primary rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold color-primary mb-4">
            Data Items
          </h2>
          {loading ? (
            <Loader />
          ) : data.length === 0 ? (
            <div className="text-center py-8 color-secondary bg-primary">
              No items found. Add one above!
            </div>
          ) : (
            <ItemList
              data={data}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          )}
        </div>
      </div>
    </div>
  )
}
