import CategoryShowcase from "./CategoryShowcase";

export default function CategoryShowcaseTwo() {
  return (
    <CategoryShowcase
      showcaseKey="showcaseTwo"
      title="Explore Categories"
      showAllText="Show All"
      showAllLink="/categories"
      emptyMessage="Select and save categories in Homepage Category Showcase Two from the Admin Dashboard."
    />
  );
}
