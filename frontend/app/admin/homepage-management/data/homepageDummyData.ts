import type {
  HomepageBanner,
} from "../types/homepage";

/* =========================================================
   LEFT MAIN HERO BANNERS

   Default:
   - 3 main hero banners

   These are temporary frontend defaults until the
   Hero Banner management section is connected to MongoDB.
========================================================= */

export const mainHeroBanners:
  HomepageBanner[] = [
    {
      id: 1,
      title: "Main Banner 1",
      image: "",
      link: "/shop",
      altText:
        "TownMela main hero banner 1",
      order: 1,
      active: true,
      type: "main",
    },
    {
      id: 2,
      title: "Main Banner 2",
      image: "",
      link: "/shop",
      altText:
        "TownMela main hero banner 2",
      order: 2,
      active: true,
      type: "main",
    },
    {
      id: 3,
      title: "Main Banner 3",
      image: "",
      link: "/shop",
      altText:
        "TownMela main hero banner 3",
      order: 3,
      active: true,
      type: "main",
    },
  ];

/* =========================================================
   RIGHT SIDE TOP BANNERS

   Default:
   - 1 right top banner

   Only one right top banner is normally visible at a time.
========================================================= */

export const rightTopBanners:
  HomepageBanner[] = [
    {
      id: 1,
      title:
        "Right Top Banner 1",
      image: "",
      link: "/shop",
      altText:
        "TownMela right side top banner 1",
      order: 1,
      active: true,
      type: "sideTop",
    },
  ];

/* =========================================================
   RIGHT SIDE BOTTOM BANNERS

   Default:
   - 3 right bottom banners

   These can be displayed as a carousel.
========================================================= */

export const rightBottomBanners:
  HomepageBanner[] = [
    {
      id: 1,
      title:
        "Right Bottom Banner 1",
      image: "",
      link: "/shop",
      altText:
        "TownMela right side bottom banner 1",
      order: 1,
      active: true,
      type: "sideBottom",
    },
    {
      id: 2,
      title:
        "Right Bottom Banner 2",
      image: "",
      link: "/shop",
      altText:
        "TownMela right side bottom banner 2",
      order: 2,
      active: true,
      type: "sideBottom",
    },
    {
      id: 3,
      title:
        "Right Bottom Banner 3",
      image: "",
      link: "/shop",
      altText:
        "TownMela right side bottom banner 3",
      order: 3,
      active: true,
      type: "sideBottom",
    },
  ];

/* =========================================================
   IMPORTANT

   Popular Categories and Category Showcases are intentionally
   not stored in this dummy data file.

   They are now loaded and managed through these APIs:

   GET    /api/popular-categories
   POST   /api/popular-categories
   PUT    /api/popular-categories/:id
   DELETE /api/popular-categories/:id

   GET /api/homepage-category-showcases
   PUT /api/homepage-category-showcases
========================================================= */
