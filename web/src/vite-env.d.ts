/// <reference types="vite/client" />

declare module "virtual:products" {
  import type { Product } from "./types";
  const products: Product[];
  export default products;
}
