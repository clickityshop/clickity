// Product catalog. Add, remove, or edit items here.
//  - id:     unique, no spaces (used in the cart)
//  - photo:  optional, e.g. "photos/dragon.jpg" — if missing, a colored placeholder is drawn
//  - colors: filament colors the buyer can pick from (first one is the default)
//  - soldOut: true hides the Add button
window.CLICKITY_PRODUCTS = [
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
