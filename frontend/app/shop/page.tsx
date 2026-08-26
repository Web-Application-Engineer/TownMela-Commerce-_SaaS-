import ShopPageClient from "@/src/components/Shop/ShopPageClient";

type ShopPageSearchParams = {
  category?: string | string[];
};

type ShopPageProps = {
  searchParams?:
    | ShopPageSearchParams
    | Promise<ShopPageSearchParams>;
};

export default async function ShopPage({
  searchParams,
}: ShopPageProps) {
  const resolvedSearchParams =
    searchParams ? await searchParams : {};

  const categoryParam =
    resolvedSearchParams.category;

  const categorySlug =
    Array.isArray(categoryParam)
      ? categoryParam[0]
      : categoryParam;

  return (
    <ShopPageClient
      categorySlug={categorySlug}
    />
  );
}
