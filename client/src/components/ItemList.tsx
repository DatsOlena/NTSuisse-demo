import ItemCard from "./ItemCard";

export default function ItemList({ 
  data, 
  onDelete, 
  deletingId 
}: { 
  data: any[]; 
  onDelete: (id: number) => void;
  deletingId?: number | null;
}) {
  return (
    <div className="space-y-4">
      {data.map((item) => (
        <ItemCard 
          key={item.id} 
          item={item} 
          onDelete={() => onDelete(item.id)}
          isDeleting={deletingId === item.id}
        />
      ))}
    </div>
  );
}
