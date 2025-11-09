export default function ItemCard({ 
  item, 
  onDelete, 
  isDeleting = false 
}: { 
  item: any; 
  onDelete: () => void;
  isDeleting?: boolean;
}) {
  return (
    <div className="border bg-primary rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold color-primary mb-1">
            {item.name}
          </h3>
          <p className="text-gray-600 mb-2">{item.description}</p>
          <p className="text-sm text-gray-400">
            Created: {new Date(item.createdAt).toLocaleString()}
          </p>
        </div>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="ml-4 text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
  