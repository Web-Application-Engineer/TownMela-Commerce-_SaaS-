import Link from "next/link";

import {
  Boxes,
  FolderTree,
  GalleryHorizontalEnd,
  LayoutDashboard,
  PackageSearch,
  ShoppingCart,
} from "lucide-react";

const dashboardLinks = [
  {
    title: "Homepage Management",
    description:
      "Manage hero banners, popular categories, and category showcases.",
    href: "/admin/homepage-management",
    icon: GalleryHorizontalEnd,
  },
  {
    title: "Products",
    description:
      "Create, update, organize, and manage product stock.",
    href: "/admin/products",
    icon: PackageSearch,
  },
  {
    title: "Categories",
    description:
      "Manage all product categories and category information.",
    href: "/admin/categories",
    icon: FolderTree,
  },
  {
    title: "Orders",
    description:
      "View customer orders and update delivery status.",
    href: "/admin/orders",
    icon: ShoppingCart,
  },
];

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-[#F7F8FA] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1450px]">
        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
              <LayoutDashboard size={23} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF6900]">
                TownMela Admin
              </p>

              <h1 className="mt-1 text-2xl font-black text-[#0B1F3A] sm:text-3xl">
                Admin Dashboard
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                Manage homepage content, products, categories, orders,
                and other ecommerce settings.
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            DASHBOARD LINKS
        ================================================= */}

        <section className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {dashboardLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900] transition-colors group-hover:bg-[#FF6900] group-hover:text-white">
                  <Icon size={21} />
                </div>

                <h2 className="mt-5 text-lg font-black text-[#0B1F3A]">
                  {item.title}
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {item.description}
                </p>

                <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#FF6900]">
                  Open Section
                  <Boxes
                    size={15}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}