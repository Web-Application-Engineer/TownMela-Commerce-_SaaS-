"use client";

import ShopPageClient from "@/src/components/Shop/ShopPageClient";

type CategoryPageClientProps = {
  categorySlug: string;
};

export default function CategoryPageClient({
  categorySlug,
}: CategoryPageClientProps) {
  return (
    <ShopPageClient
      categorySlug={categorySlug}
    />
  );
}