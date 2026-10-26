import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** Scroll-choreographed reveal: gentle opacity + vertical movement, once. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const anim = reduce
    ? {}
    : {
        initial: { opacity: 0, y },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-60px" },
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const, delay },
      };
  return (
    <motion.div className={className} {...anim}>
      {children}
    </motion.div>
  );
}
