import { useState } from "react";

export default function ItemForm({ onSubmit }: { onSubmit: (data: any) => void }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit({ name, description });
      setName("");
      setDescription("");
    };
  
    return (
      <form onSubmit={handleSubmit} className="bg-secondary p-4 rounded shadow flex flex-col gap-3">
        <input
          type="text"
          placeholder="Item name"
          className="border bg-primary text-secondary rounded px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <textarea
          placeholder="Description"
          className="border bg-primary text-secondary rounded px-3 py-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button className="bg-primary text-secondary py-2 rounded">Add Item</button>
      </form>
    );
  }