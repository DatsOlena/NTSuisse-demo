import { useEffect, useState } from "react";
import ItemForm from "../components/ItemForm";
import ItemList from "../components/ItemList";
import Loader from "../components/Loader";
import { getAllItems, createItem, deleteItem } from "../api";

export default function Dashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllItems().then(setItems).finally(() => setLoading(false));
  }, []);

  const handleAdd = async (data: any) => {
    await createItem(data);
    setItems(await getAllItems());
  };

  const handleDelete = async (id: number) => {
    await deleteItem(id);
    setItems(await getAllItems());
  };

  if (loading) return <Loader />;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Item Manager</h1>
      <ItemForm onSubmit={handleAdd} />
      <div className="mt-6">
        <ItemList data={items} onDelete={handleDelete} />
      </div>
    </div>
  );
}
