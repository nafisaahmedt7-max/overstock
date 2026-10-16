"use client";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
export type CartItem = {
  slug: string;
  name: string;
  price: number;
  size: string;
  quantity: number;
};
type Value = {
  items: CartItem[];
  count: number;
  add: (item: Omit<CartItem, "quantity">) => void;
  remove: (slug: string, size: string) => void;
  clear: () => void;
};
const CartContext = createContext<Value | null>(null);
const STORAGE_KEY = "overstock-cart-v1";
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [notice, setNotice] = useState<{ name: string; size: string } | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restored = useRef(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setItems(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
      } catch {
        setItems([]);
      }
      restored.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (restored.current)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);
  const value = useMemo<Value>(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      add: (next) => {
        setItems((current) => {
          const match = current.find(
            (item) => item.slug === next.slug && item.size === next.size,
          );
          return match
            ? current.map((item) =>
                item === match
                  ? { ...item, quantity: item.quantity + 1 }
                  : item,
              )
            : [...current, { ...next, quantity: 1 }];
        });
        setNotice({ name: next.name, size: next.size });
        if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
        noticeTimer.current = window.setTimeout(() => setNotice(null), 2400);
      },
      remove: (slug, size) =>
        setItems((current) =>
          current.filter((item) => item.slug !== slug || item.size !== size),
        ),
      clear: () => setItems([]),
    }),
    [items],
  );
  useEffect(
    () => () => {
      if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    },
    [],
  );
  return (
    <CartContext.Provider value={value}>
      {children}
      {notice && (
        <Link
          href="/cart"
          className="store-toast show"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`${notice.name}, size ${notice.size}, added to cart. View cart.`}
        >
          <span>ADDED TO CART</span>
          <strong>VIEW CART</strong>
        </Link>
      )}
    </CartContext.Provider>
  );
}
export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
