// Product catalog. Add, remove, or edit items here.
//  - id:     unique, no spaces (used in the cart)
//  - photo:  optional, e.g. "photos/dragon.jpg" — if missing, a colored placeholder is drawn
//  - colors: filament colors the buyer can pick from (first one is the default)
//  - soldOut: true hides the Add button
const CLICKITY_PRODUCTS = [
  {
    id: "infinity-cube",
    name: "Infinity Cube",
    blurb: "Folds over and over forever. Silent enough for class.",
    price: 5,
    shape: "cube",
    colors: ["Galaxy Purple", "Lime", "Ocean Blue"],
  },
  {
    id: "flexi-dragon",
    name: "Flexi Dragon",
    blurb: "Fully articulated, printed in one piece. Wiggles like it's alive.",
    price: 8,
    shape: "dragon",
    colors: ["Silk Rainbow", "Glow-in-the-Dark", "Red"],
  },
  {
    id: "clicker-key",
    name: "Clicker Keychain",
    blurb: "That satisfying click — clips to your backpack.",
    price: 3,
    shape: "clicker",
    colors: ["Orange", "Teal", "Black"],
  },
  {
    id: "two-key-clicker",
    name: "2-Key Keyboard Clicker",
    blurb: "Two real clicky keyboard switches. Mash away — it's the best sound.",
    price: 6,
    shape: "keys",
    colors: ["Black", "White", "Galaxy Purple", "Ocean Blue"],
  },
  {
    id: "sliding-ball",
    name: "Sliding Ball",
    blurb: "A ball that glides back and forth in a track. Smooth and calming.",
    price: 4,
    shape: "slider",
    colors: ["Teal", "Orange", "Lime", "Pastel Pink"],
  },
  {
    id: "gear-spinner",
    name: "Gear Spinner",
    blurb: "Three interlocking gears. Spin one, they all go.",
    price: 6,
    shape: "gear",
    colors: ["Silver", "Gold", "Neon Green"],
  },
  {
    id: "fidget-slug",
    name: "Fidget Slug",
    blurb: "Segmented, squishy-feeling, and weirdly cute.",
    price: 4,
    shape: "slug",
    colors: ["Pastel Pink", "Mint", "Lemon"],
  },
  {
    id: "push-pop",
    name: "Push Pop Coin",
    blurb: "Click-in buttons on a pocket-sized coin.",
    price: 3,
    shape: "pop",
    colors: ["Sunset", "Sky", "White"],
  },
];

if (typeof window !== "undefined") window.CLICKITY_PRODUCTS = CLICKITY_PRODUCTS;
if (typeof module !== "undefined") module.exports = CLICKITY_PRODUCTS;
