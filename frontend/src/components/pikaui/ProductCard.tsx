"use client";

interface ProductCardProps {
  name: string;
  price: number;
  image: string;
  description: string;
  color?: string;
  inStock?: boolean;
}

export function ProductCard({ name, price, image, description, color, inStock = true }: ProductCardProps) {
  return (
    <div className="p-4">
      <div className="relative w-full h-40 rounded-xl overflow-hidden bg-zinc-800 mb-3">
        <img src={image} alt={name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://picsum.photos/400/300"; }} />
        <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-sm font-bold text-white">
          ${price}
        </div>
        {!inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-red-400 font-medium text-sm">Out of Stock</span>
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm truncate">{name}</h3>
          <p className="text-zinc-400 text-xs mt-1 line-clamp-2">{description}</p>
        </div>
        {color && color !== "default" && (
          <div className="flex-shrink-0 flex items-center gap-1.5 mt-0.5">
            <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-zinc-500 capitalize">{color}</span>
          </div>
        )}
      </div>
      {inStock && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-emerald-400">In Stock</span>
        </div>
      )}
    </div>
  );
}
