"use client";

import { useState } from "react";
import { ExternalLinkIcon, ShoppingCartIcon, StarIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHoverScale } from "../hooks/use-gsap-animation";

interface CPSProduct {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  image?: string;
  platform: "jd" | "meituan";
  rating?: number;
  commission?: number;
  url: string;
  tags?: string[];
}

interface CPSProductCardProps {
  product: CPSProduct;
  onTrack?: (productId: string) => void;
}

export function CPSProductCard({ product, onTrack }: CPSProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hoverRef = useHoverScale();

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  return (
    <Card
      ref={hoverRef}
      className="overflow-hidden transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-0">
        <div className="flex gap-3 p-3">
          {/* Image placeholder */}
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
            {product.image ? (
              <img
                src={product.image}
                alt={product.title}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <ShoppingCartIcon className="w-8 h-8 text-gray-300" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-medium truncate">{product.title}</h4>
              <Badge
                variant={product.platform === "jd" ? "default" : "secondary"}
                className="text-[10px] flex-shrink-0"
              >
                {product.platform === "jd" ? "京东" : "美团"}
              </Badge>
            </div>

            {product.rating && (
              <div className="flex items-center gap-1 mt-1">
                <StarIcon className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-xs text-gray-500">{product.rating}</span>
              </div>
            )}

            {product.tags && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-end justify-between mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold text-red-500">
                  ¥{product.price.toLocaleString()}
                </span>
                {product.originalPrice && (
                  <span className="text-xs text-gray-400 line-through">
                    ¥{product.originalPrice.toLocaleString()}
                  </span>
                )}
                {discount && (
                  <Badge variant="destructive" className="text-[10px]">
                    -{discount}%
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons - show on hover */}
        <div
          className={`flex gap-2 px-3 pb-3 transition-all duration-300 ${
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          }`}
        >
          <Button
            size="sm"
            className="flex-1"
            onClick={() => {
              onTrack?.(product.id);
              window.open(product.url, "_blank");
            }}
          >
            <ExternalLinkIcon className="w-3 h-3 mr-1" />
            去购买
          </Button>
        </div>

        {product.commission && (
          <div className="px-3 pb-2 text-[10px] text-green-600">
            预计返佣 ¥{product.commission.toFixed(2)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CPSProductListProps {
  products: CPSProduct[];
  title?: string;
  onTrack?: (productId: string) => void;
}

export function CPSProductList({ products, title = "推荐商品", onTrack }: CPSProductListProps) {
  if (products.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {products.map((product) => (
          <CPSProductCard key={product.id} product={product} onTrack={onTrack} />
        ))}
      </div>
    </div>
  );
}
